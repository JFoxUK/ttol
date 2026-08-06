declare module '@devvit/web/client' {
  export const context: {
    username?: string | null;
  };

  export function requestExpandedMode(event: MouseEvent, entry: string): void;
}
