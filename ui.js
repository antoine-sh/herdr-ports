// Pure view pieces: no state, no host calls beyond theme.
import { div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { theme } from "herdr";

const iconButton = (id, icon, color, onClick) =>
  div().id(id).p(3).rounded(4)
    .hover((s) => s.bg(theme().hover))
    .on_click(onClick)
    .child(svg(`mods/ports/${icon}.svg`).size(14).text_color(color));

export function portRow(port, local, { onToggle, onOpen }) {
  const t = theme();
  const on = local != null;
  return h_flex().px(8).py(3).gap(8).items_center()
    .child(div().text_size(13).text_color(on ? t.foreground : t.muted).child(on && local !== port ? `${port} → ${local}` : String(port)))
    .child(iconButton(`port-${port}`, "power", on ? t.working : t.dim, onToggle))
    .when(on, (el) => el.child(iconButton(`open-${port}`, "open", t.muted, onOpen)));
}

export function panel({ machine, auto, onAuto, onlyFwd, onOnly, message, rows }) {
  const t = theme();
  return v_flex().size_full().bg(t.chrome)
    .child(h_flex().h(31).flex_none().pl(16).pr(10).items_center().text_size(11.5).text_color(t.dim)
      .child(div().flex_1().child(`Ports${machine ? " · " + machine : ""}`))
      .child(div().id("only-forwarded").px(6).py(2).rounded(4)
        .text_color(onlyFwd ? t.working : t.dim)
        .hover((s) => s.bg(t.hover))
        .on_click(onOnly)
        .child(onlyFwd ? "Fwd only ✓" : "Fwd only"))
      .child(div().id("auto-forward").px(6).py(2).rounded(4)
        .text_color(auto ? t.working : t.dim)
        .hover((s) => s.bg(t.hover))
        .on_click(onAuto)
        .child(auto ? "Auto ✓" : "Auto")))
    .child(message
      ? div().px(14).text_size(12).text_color(t.dim).child(message)
      : v_flex().flex_1().overflow_y_scrollbar().px(6).gap(1).children(rows));
}
