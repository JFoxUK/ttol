declare module '@devvit/web/client' {
  export const context: {
    username?: string | null;
  };

  export function requestExpandedMode(event: MouseEvent, entry: string): void;

  export function showToast(
    textOrToast:
      | string
      | {
          text: string;
          appearance?: 'neutral' | 'success' | 'caution';
        }
  ): void;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.css';
