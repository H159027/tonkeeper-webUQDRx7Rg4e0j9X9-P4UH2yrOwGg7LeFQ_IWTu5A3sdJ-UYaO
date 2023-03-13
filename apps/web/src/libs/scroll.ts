export const disableScroll = () => {
  window.document.body.style.overflow = 'hidden';
  window.document.body.style.paddingRight = `${getScrollbarWidth()}px`;
};

export const enableScroll = () => {
  window.document.body.style.overflow = 'auto';
  window.document.body.style.paddingRight = '0px';
};

export const getScrollbarWidth = () => {
  // Creating invisible container
  const outer = document.createElement('div');
  outer.style.visibility = 'hidden';
  outer.style.overflow = 'scroll'; // forcing scrollbar to appear
  (outer.style as any).msOverflowStyle = 'scrollbar'; // needed for WinJS apps
  document.body.appendChild(outer);

  // Creating inner element and placing it in the container
  const inner = document.createElement('div');
  outer.appendChild(inner);

  // Calculating difference between container's full width and the child width
  const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;

  // Removing temporary elements from the DOM
  outer.parentNode!.removeChild(outer);

  return scrollbarWidth;
};


export const virtualKeyboardHeight = () => {
  var sx = document.body.scrollLeft, sy = document.body.scrollTop;
  var naturalHeight = window.innerHeight;
  window.scrollTo(sx, document.body.scrollHeight);
  var keyboardHeight = naturalHeight - window.innerHeight;
  window.scrollTo(sx, sy);
  return keyboardHeight;
};