/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import net from "net";
import {IncomingMessage} from "http";

type IPFamily = "ipv4" | "ipv6";

interface ParsedIP {
    address: string
    family: IPFamily
}

// named groups of addresses that could be used in --trusted-proxies
const TRUSTED_PROXY_PRESETS: Record<string, string[]> = {
    "loopback": ["127.0.0.0/8", "::1/128"],
    "linklocal": ["169.254.0.0/16", "fe80::/10"],
    "uniquelocal": ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "fc00::/7"],
};

TRUSTED_PROXY_PRESETS["private"] = TRUSTED_PROXY_PRESETS["uniquelocal"];

/**
 * Parse an IP address, IPv4-mapped IPv6 addresses (::ffff:a.b.c.d) are converted to plain IPv4.
 */
function parseIP(value: string): ParsedIP | null {
    let address = value.trim();

    if (address.toLowerCase().startsWith("::ffff:") && net.isIPv4(address.substring(7))) {
        address = address.substring(7);
    }

    if (net.isIPv4(address)) {
        return {address, family: "ipv4"};
    } else if (net.isIPv6(address)) {
        return {address: address.toLowerCase(), family: "ipv6"};
    }

    return null;
}

/**
 * Parse a single entry of the X-Forwarded-For header. Some proxies are appending the port number,
 * so "a.b.c.d:port" and "[v6]:port" forms are also accepted.
 */
function parseForwardedEntry(value: string): ParsedIP | null {
    const entry = value.trim();
    const parsed = parseIP(entry);

    if (parsed) {
        return parsed;
    }

    const v6WithPort = /^\[([0-9a-fA-F:.]+)](?::\d{1,5})?$/.exec(entry);

    if (v6WithPort) {
        return parseIP(v6WithPort[1]);
    }

    const v4WithPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d{1,5}$/.exec(entry);

    if (v4WithPort) {
        return parseIP(v4WithPort[1]);
    }

    return null;
}

class TrustedProxies {
    private readonly blockList = new net.BlockList();
    private readonly empty: boolean;

    /**
     * @param spec Comma-separated list of IP addresses, CIDR ranges (e.g. 10.0.0.0/8, fd00::/8)
     *             or presets: loopback, linklocal, uniquelocal (alias: private).
     */
    constructor(spec: string | null | undefined) {
        const entries = (spec ?? "")
            .split(",")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0);

        for (const entry of entries) {
            if (Object.prototype.hasOwnProperty.call(TRUSTED_PROXY_PRESETS, entry.toLowerCase())) {
                TRUSTED_PROXY_PRESETS[entry.toLowerCase()].forEach((cidr) => this.addCIDR(cidr, entry));
            } else if (entry.includes("/")) {
                this.addCIDR(entry, entry);
            } else {
                const ip = parseIP(entry);

                if (!ip) {
                    throw new Error("Invalid trusted proxy entry: " + entry);
                }

                this.blockList.addAddress(ip.address, ip.family);
            }
        }

        this.empty = entries.length === 0;
    }

    private addCIDR(cidr: string, originalEntry: string) {
        const [rawAddress, rawPrefix, ...rest] = cidr.split("/");
        const ip = parseIP(rawAddress);
        const prefix = Number(rawPrefix);
        const maxPrefix = ip?.family === "ipv4" ? 32 : 128;

        if (!ip || rest.length !== 0 || !/^\d{1,3}$/.test(rawPrefix) || prefix > maxPrefix) {
            throw new Error("Invalid trusted proxy entry: " + originalEntry);
        }

        this.blockList.addSubnet(ip.address, prefix, ip.family);
    }

    isEmpty() {
        return this.empty;
    }

    isTrusted(ip: ParsedIP) {
        if (this.empty) {
            return false;
        }

        try {
            return this.blockList.check(ip.address, ip.family);
        } catch (e) {
            // e.g. IPv6 address with a zone index
            return false;
        }
    }
}

let warnedAboutUntrustedForwarding = false;

/**
 * Resolve the IP address of the actual client.
 *
 * The X-Forwarded-For header is only taken into account if the direct peer is a trusted proxy.
 * The header is then walked from right to left (each proxy appends the address of its own peer)
 * for as long as the addresses belong to trusted proxies. The first untrusted address is the client.
 * Anything to the left of it was supplied by the client itself, so it is never used.
 */
function resolveClientIP(req: IncomingMessage, trustedProxies: TrustedProxies): string {
    const remote = req.socket.remoteAddress ? parseIP(req.socket.remoteAddress) : null;

    if (!remote) {
        return "Unknown";
    }

    const forwardedHeader = req.headers['x-forwarded-for'];

    if (!trustedProxies.isTrusted(remote)) {
        if (forwardedHeader && !warnedAboutUntrustedForwarding && trustedProxies.isEmpty()) {
            warnedAboutUntrustedForwarding = true;
            console.warn('[!] Received X-Forwarded-For header from ' + remote.address + ', which is not a trusted proxy. ' +
                'The header is ignored. If the server is running behind a reverse proxy, ' +
                'please pass its address with --trusted-proxies.');
        }

        return remote.address;
    }

    const hops = (Array.isArray(forwardedHeader) ? forwardedHeader.join(",") : (forwardedHeader ?? ""))
        .split(",")
        .map((hop) => hop.trim())
        .filter((hop) => hop.length > 0)
        .reverse();

    let client = remote;

    for (const hop of hops) {
        const hopIP = parseForwardedEntry(hop);

        if (!hopIP) {
            // malformed entry, stop at the last known good address
            break;
        }

        client = hopIP;

        if (!trustedProxies.isTrusted(client)) {
            break;
        }
    }

    return client.address;
}

export {TrustedProxies, resolveClientIP};
