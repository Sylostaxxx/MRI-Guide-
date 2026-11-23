import {OsEventTypeList as Event,EventSourceType as Source} from '@evenrealities/even_hub_sdk';

const touch = new Set([Source.TOUCH_EVENT_FROM_GLASSES_R,Source.TOUCH_EVENT_FROM_GLASSES_L,Source.TOUCH_EVENT_FROM_RING]);

export function studyInput(event) {
  const system=event.sysEvent;
  const target=event.textEvent;
  const received=target ?? system;
  if (!received) return null;
  // Zero may be omitted when the host serializes a press. Some hosts route
  // touch gestures as sysEvent with a source even with a text capture target.
  const kind=received.eventType ?? (target || touch.has(system?.eventSource)?Event.CLICK_EVENT:null);
  switch(kind) {
    case Event.CLICK_EVENT:return 'tap';
    case Event.DOUBLE_CLICK_EVENT:return 'back';
    case Event.SCROLL_TOP_EVENT:return 'up';
    case Event.SCROLL_BOTTOM_EVENT:return 'down';
    default:return null;
  }
}
