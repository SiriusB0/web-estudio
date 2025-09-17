declare module 'dom-anchor-text-quote' {
  export interface TextQuoteSelector {
    type: 'TextQuoteSelector';
    exact: string;
    prefix?: string;
    suffix?: string;
  }

  export function describe(root: Element, range: Range): TextQuoteSelector | null;
  export function anchor(root: Element, selector: TextQuoteSelector): Range | null;
}
