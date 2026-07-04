import "@testing-library/jest-dom";
import "@ant-design/v5-patch-for-react-19";

// Ant Design queries these browser APIs; jsdom doesn't implement them.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// jsdom throws on the two-argument (pseudo-element) form that antd's Table uses
// to measure the scrollbar; drop the pseudo-element and defer to the real call.
const realGetComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = ((element: Element) =>
  realGetComputedStyle(element)) as typeof window.getComputedStyle;
