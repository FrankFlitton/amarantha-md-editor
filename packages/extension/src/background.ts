// Only job: clicking the toolbar icon opens the settings page. There's no
// popup UI declared in manifest.json, so `action.onClicked` fires directly
// (Chrome only suppresses it when a `default_popup` is present).
chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});
