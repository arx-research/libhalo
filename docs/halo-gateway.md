# HaLo Gateway

HaLo Gateway is a special tool which would allow you to perform HaLo operations straight on your desktop,
using your smartphone as the NFC reader for interaction with HaLo tags.

## Architecture graph

![Graph: Using smartphone as the NFC scanner when doing HaLo operations on the desktop.](/docs/images/halo_gateway_graph.png)

## Using HaLo Gateway

### End-user side

In order to use HaLo Gateway, you need to both access your desktop computer and smartphone.

1. **On desktop:** Open the website which supports the usage of HaLo Gateway.
2. **On desktop:** Whenever the website will display a QR code and ask you to pair your smartphone, please scan the
   QR code with your smartphone.
3. **On smartphone:** The tag scanner web page will open up.
4. **On desktop:** The website will signal that the pairing process was successful.
5. **On desktop:** Continue your operations on the website, until it asks you to scan the HaLo tag.
6. **On smartphone:** Review the command requested, click `[Confirm]` button and tap the HaLo tag to the back
   of your smartphone in order to scan it.
7. **On smartphone:** You should see an indication that the command was executed successfully.
8. **On desktop:** The command's execution result will arrive from your smartphone and the operation will be
   continued. Continue operations on the desktop.

### Web application's developer side

Please see `web/examples/gateway_requestor.html` for an example web application which uses
HaLo Gateway. This web application provides a simple demo which can be opened on the desktop. You can
request to sign an arbitrary message on the desktop, and then scan HaLo with your smartphone.
The result will be delivered back to the desktop web application who requested it.
