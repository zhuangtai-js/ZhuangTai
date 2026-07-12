import { atom, computed } from "@zhuangtai-js/core";
// oxlint-disable-next-line import/no-unassigned-import -- Vite extracts this CSS entry.
import "./style.css";

const count = atom(0);
const parity = computed(() => (count.get() % 2 === 0 ? "偶数" : "奇数"));

const countOutput = requireElement("count", HTMLOutputElement);
const parityOutput = requireElement("parity", HTMLParagraphElement);
const eventList = requireElement("events", HTMLOListElement);

let eventIndex = 0;

count.watch((value, prevValue) => {
  countOutput.value = String(value);
  const event = document.createElement("li");
  eventIndex += 1;
  event.innerHTML = `<span>#${eventIndex}</span><code>${String(prevValue)} → ${value}</code>`;
  eventList.prepend(event);

  while (eventList.children.length > 5) {
    eventList.lastElementChild?.remove();
  }
});

parity.watch((value) => {
  parityOutput.textContent = value;
});

requireElement("decrement", HTMLButtonElement).addEventListener("click", () => {
  count.set((value) => value - 1);
});
requireElement("reset", HTMLButtonElement).addEventListener("click", () => {
  count.set(0);
});
requireElement("increment", HTMLButtonElement).addEventListener("click", () => {
  count.set((value) => value + 1);
});

type ElementConstructor<ElementType extends HTMLElement> = new () => ElementType;

function requireElement<ElementType extends HTMLElement>(
  id: string,
  constructor: ElementConstructor<ElementType>,
): ElementType {
  const element = document.getElementById(id);

  if (!(element instanceof constructor)) {
    throw new Error(`Missing required element #${id}`);
  }

  return element;
}
