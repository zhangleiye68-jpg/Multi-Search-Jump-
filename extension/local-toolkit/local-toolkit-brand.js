(() => {
  const TOOLKIT_NAME = "绿色工具箱";

  function applyToolkitBrand() {
    const title = document.querySelector(".popup-wrapper .header-title");

    if (title && title.textContent !== TOOLKIT_NAME) {
      title.textContent = TOOLKIT_NAME;
    }
  }

  applyToolkitBrand();

  const observer = new MutationObserver(applyToolkitBrand);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
