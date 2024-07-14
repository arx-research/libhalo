const PROMPT_STYLES = `
@keyframes __libhalo_popup_waitingRingGrow {
  0% {
    width: 66px;
    height: 66px;
    opacity: 0;
  }
  20% {
    opacity: 0.2;
  }
  65% {
    opacity: 0.2;
  }
  100% {
    opacity: 0;
    width: 120px;
    height: 120px;
  }
}
.__libhalo_popup .waiting {
  color: white;
  text-align: center;
}
.__libhalo_popup .waiting--space-top {
  padding-top: 120px;
}
.__libhalo_popup .waiting--red {
  color: #fe0133;
}
.__libhalo_popup .waiting--blue {
  color: #0047ff;
}
.__libhalo_popup .waiting--green {
  color: #43a815;
}
.__libhalo_popup .waiting {
  justify-content: center;
  align-items: center;
  display: flex;
  flex-direction: column;
}
.__libhalo_popup .waiting-x {
  width: 60px;
  height: 60px;
  position: relative;
  margin: 25px auto 32px;
  padding: 0;
  font-size: 12px !important;
}
.__libhalo_popup .waiting-x img,
.__libhalo_popup .waiting-x svg {
  z-index: 2;
  position: relative;
  max-width: none;
  margin: 0;
}
.__libhalo_popup .waiting-x:before, .__libhalo_popup .waiting-x:after {
  z-index: 1;
  content: "";
  width: 40px;
  height: 40px;
  border: 1px solid currentColor;
  border-radius: 50%;
  display: block;
  position: absolute;
  top: 50%;
  left: 50%;
  opacity: 0.3;
  transform: translate(-50%, -50%);
  animation: 3s __libhalo_popup_waitingRingGrow infinite linear;
}
.__libhalo_popup .waiting-x:after {
  animation-delay: 1.5s;
}
.__libhalo_popup .waiting-text {
  padding: 0;
  font-size: 14px !important;
  text-transform: uppercase;
  font-weight: 600;
  color: white;
  margin: 20px 0 0 0;
  width: 100%;
  height: 64px;
  overflow: hidden;
  font-family: system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue","Noto Sans","Liberation Sans",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji";
}

.__libhalo_popup .cancel-button {
  width: 100%;
  height: auto;
  font-weight: 600;
  margin: 10px 0 0 0;
  font-size: 12px !important;
  background: #232323;
  border: 1px solid white;
  color: white;
  padding: 10px;
  font-family: system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue","Noto Sans","Liberation Sans",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji";
}

#__libhalo_popup {
  position: fixed;
  border-radius: 20px;
  padding: 20px;
  height: 290px;
  width: calc(80vw - 40px);
  left: calc(10vw + 20px);
  font-size: 12px;
  text-align: center;
  top: 50%;
  margin: -145px 0 0 0;
  background: #232323;
  z-index: 99999;
}

#__libhalo_popup:after {
  position: fixed;
  content: "";
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: rgba(0,0,0,0.5);
  z-index: -2;
}

#__libhalo_popup:before {
  position: absolute;
  border-radius: 20px;
  content: "";
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: #232323;
  z-index: -1;
}`;

const PROMPT_HTML = `
<div class="waiting">
    <div class="waiting-x">
        <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" fill="none">
            <path
                fill="#0c0c0c"
                d="M30 60c16.569 0 30-13.431 30-30C60 13.431 46.569 0 30 0 13.431 0 0 13.431 0 30c0 16.569 13.431 30 30 30Z"
            />
            <path
                fill="currentColor"
                d="M30 4.79c6.734 0 13.06 2.618 17.826 7.384A25.053 25.053 0 0 1 55.21 30c0 6.733-2.618 13.06-7.384 17.826A25.053 25.053 0 0 1 30 55.21c-6.734 0-13.06-2.618-17.826-7.384A25.053 25.053 0 0 1 4.79 30c0-6.734 2.618-13.06 7.384-17.826A25.053 25.053 0 0 1 30 4.789Zm0-1.247C15.388 3.543 3.543 15.388 3.543 30S15.388 56.456 30 56.456 56.457 44.612 56.457 30 44.612 3.543 30 3.543ZM35.08 30l2.116-3.175 5.096-7.643h-6.499l-4.57 6.859s-.024.031-.031.047l-.063.094a7.054 7.054 0 0 0-1.043 2.76h-.164a7.052 7.052 0 0 0-1.043-2.76l-.063-.094c-.008-.016-.023-.031-.031-.047l-4.57-6.86h-6.499l2.799 4.203L24.928 30l-2.116 3.175-5.096 7.643h6.499l4.57-6.86s.023-.03.031-.047l.063-.094a7.052 7.052 0 0 0 1.043-2.759h.164a7.053 7.053 0 0 0 1.043 2.76l.063.093c.007.016.023.032.03.047l4.571 6.86h6.499l-2.799-4.202L35.08 30Z"
            />
        </svg>
    </div>
    <div class="waiting-text" id="__libhalo_popup_status_text">Loading...</div>
    <button class="cancel-button" id="__libhalo_popup_cancel_btn">CANCEL SCAN</button>
</div>
`;

function emulatedPromptStatusCallback(status, statusObj) {
    if (!document.getElementById('__libhalo_popup_stylesheet')) {
        const style = document.createElement('style');
        style.setAttribute('id', '__libhalo_popup_stylesheet');
        style.textContent = PROMPT_STYLES;
        document.head.append(style);
    }

    if (!document.getElementById('__libhalo_popup')) {
        const pdiv1 = document.createElement('div');
        pdiv1.setAttribute('id', '__libhalo_popup');
        pdiv1.setAttribute('class', '__libhalo_popup');
        pdiv1.innerHTML = PROMPT_HTML;

        document.body.append(pdiv1);
    }

    const rdiv = document.getElementById('__libhalo_popup');
    const pdiv = document.getElementById('__libhalo_popup_status_text');
    const cancelBtn = document.getElementById('__libhalo_popup_cancel_btn');
    let statusText;

    switch (status) {
        case "init": statusText = "Please tap your HaLo tag to the back of your smartphone and hold it for a while..."; break;
        case "again": statusText = "Almost there... Please tap HaLo tag again..."; break;
        case "retry": statusText = "Something went wrong, please try again..."; break;
        case "scanned": statusText = "Scan successful, please wait..."; break;
        default: statusText = "<" + status + ">"; break;
    }

    pdiv.innerText = statusText;
    cancelBtn.onclick = statusObj.cancelScan;
    rdiv.style.display = status !== 'finished' ? 'block' : 'none';
}

export {
    emulatedPromptStatusCallback
};
