/* Money is stored and sent as integer minor units. It becomes a decimal string
   here and nowhere else. */

   export function money(minor: number, currency: string): string {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(minor / 100);
  }
  
  export function clockTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  
  export function dayAndTime(iso: string): string {
    const day = new Date(iso).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    return `${day}, ${clockTime(iso)}`;
  }
  
  export function runtime(minutes: number): string {
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
  }
  
  export function mmss(totalSeconds: number): string {
    const s = Math.max(0, totalSeconds);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  
  export const seatLabel = (rowLabel: string, seatNumber: number): string =>
    `${rowLabel}${seatNumber}`;