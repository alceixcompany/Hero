// Local Node hosting uses /ws on this origin. The static build replaces this
// with an explicitly configured HTTPS room server, or null when unavailable.
export const ROOM_SERVER_ORIGIN=undefined;
export const ROOM_TRANSPORT='websocket';
