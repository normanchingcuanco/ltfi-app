import { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';

// Note formatting. The toolbar inserts these markers around your selection,
// and the display renders them. You can also type them by hand.
//   **bold**   *italic*   - bullet   # heading   {orange}text{/orange}
//   >c  center line   >r  right line   [Label](https://...)  and bare links
// Colors: orange, green, red, gray

export const NOTE_COLORS = {
  orange: '#F77E2D',
  green: '#388E3C',
  red: '#D32F2F',
  gray: '#888'
};

// Order matters: when two rules match at the same position, the earlier rule wins.
const INLINE_RULES = [
  { type: 'link', re: /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/ },
  { type: 'url', re: /https?:\/\/[^\s*{}]+/ },
  { type: 'bold', re: /\*\*([^*][\s\S]*?)\*\*/ },
  { type: 'italic', re: /\*([^*\s][^*]*)\*/ },
  { type: 'color', re: /\{(orange|green|red|gray)\}([\s\S]+?)\{\/\1\}/ }
];

// start/end on link nodes are positions in the full original text,
// so a link can be edited in place.
const parseInline = (text, base = 0) => {
  const nodes = [];
  let pos = 0;
  while (pos < text.length) {
    const rest = text.slice(pos);
    let best = null;
    for (const rule of INLINE_RULES) {
      const m = rule.re.exec(rest);
      if (m && (best === null || m.index < best.m.index)) best = { rule, m };
    }
    if (!best) {
      nodes.push({ type: 'text', value: rest });
      break;
    }
    const { rule, m } = best;
    if (m.index > 0) nodes.push({ type: 'text', value: rest.slice(0, m.index) });
    const start = base + pos + m.index;
    const end = start + m[0].length;
    if (rule.type === 'link') {
      nodes.push({ type: 'link', label: m[1], url: m[2], start, end });
    } else if (rule.type === 'url') {
      nodes.push({ type: 'link', label: m[0], url: m[0], start, end });
    } else if (rule.type === 'color') {
      nodes.push({ type: 'color', color: m[1], children: parseInline(m[2], start + m[0].indexOf('}') + 1) });
    } else {
      const markerLen = rule.type === 'bold' ? 2 : 1;
      nodes.push({ type: rule.type, children: parseInline(m[1], start + markerLen) });
    }
    pos += m.index + m[0].length;
  }
  return nodes;
};

export const parseNotes = (text) => {
  const lines = [];
  let offset = 0;
  (text || '').split('\n').forEach((line) => {
    let align = 'l';
    let prefixLen = 0;
    const a = /^>([cr]) /.exec(line);
    if (a) {
      align = a[1];
      prefixLen = a[0].length;
    }
    const rest = line.slice(prefixLen);
    let kind = 'p';
    const h = /^#\s+/.exec(rest);
    const b = /^-\s+/.exec(rest);
    if (h) {
      kind = 'h';
      prefixLen += h[0].length;
    } else if (b) {
      kind = 'b';
      prefixLen += b[0].length;
    }
    lines.push({ kind, align, nodes: parseInline(line.slice(prefixLen), offset + prefixLen) });
    offset += line.length + 1;
  });
  return lines;
};

const nodesHaveFormat = (nodes) => nodes.some(n => n.type === 'bold' || n.type === 'italic' || n.type === 'color');

export const hasFormatting = (text) =>
  !!text && parseNotes(text).some(l => l.kind !== 'p' || l.align !== 'l' || nodesHaveFormat(l.nodes));

// ---------- formatting actions used by the toolbar ----------

// Wrap the selection in open/close markers. Tapping again on the same
// selection removes them. With no selection, markers go in with the cursor between.
const wrapSelection = (text, sel, open, close) => {
  const { start, end } = sel;
  const before = text.slice(0, start);
  const mid = text.slice(start, end);
  const after = text.slice(end);
  const isItalic = open === '*';
  const surrounded = start !== end && before.endsWith(open) && after.startsWith(close)
    && !(isItalic && (before.endsWith('**') || after.startsWith('**')));
  if (surrounded) {
    return {
      text: before.slice(0, before.length - open.length) + mid + after.slice(close.length),
      selection: { start: start - open.length, end: end - open.length }
    };
  }
  const selfWrapped = start !== end && mid.length >= open.length + close.length
    && mid.startsWith(open) && mid.endsWith(close)
    && !(isItalic && (mid.startsWith('**') || mid.endsWith('**')));
  if (selfWrapped) {
    const inner = mid.slice(open.length, mid.length - close.length);
    return { text: before + inner + after, selection: { start, end: start + inner.length } };
  }
  return {
    text: before + open + mid + close + after,
    selection: { start: start + open.length, end: end + open.length }
  };
};

// Change the line prefixes (align marker and heading/bullet marker)
// on every line the selection touches.
const changeLines = (text, sel, edit) => {
  const s = text.lastIndexOf('\n', sel.start - 1) + 1;
  let e = text.indexOf('\n', sel.end);
  if (e === -1) e = text.length;
  const lines = text.slice(s, e).split('\n');
  let firstDelta = 0;
  let totalDelta = 0;
  const out = lines.map((line, i) => {
    const m = /^(>[cr] )?(# |- )?/.exec(line);
    const next = edit({ align: m[1] || '', block: m[2] || '' });
    const rebuilt = next.align + next.block + line.slice(m[0].length);
    const delta = rebuilt.length - line.length;
    if (i === 0) firstDelta = delta;
    totalDelta += delta;
    return rebuilt;
  });
  return {
    text: text.slice(0, s) + out.join('\n') + text.slice(e),
    selection: {
      start: Math.max(s, sel.start + firstDelta),
      end: Math.max(s, sel.end + totalDelta)
    }
  };
};

export const applyFormat = (text, sel, kind, arg) => {
  if (kind === 'bold') return wrapSelection(text, sel, '**', '**');
  if (kind === 'italic') return wrapSelection(text, sel, '*', '*');
  if (kind === 'color') return wrapSelection(text, sel, `{${arg}}`, `{/${arg}}`);
  if (kind === 'heading') return changeLines(text, sel, ({ align, block }) => ({ align, block: block === '# ' ? '' : '# ' }));
  if (kind === 'bullet') return changeLines(text, sel, ({ align, block }) => ({ align, block: block === '- ' ? '' : '- ' }));
  if (kind === 'align') {
    return changeLines(text, sel, ({ align, block }) => {
      const want = arg === 'center' ? '>c ' : arg === 'right' ? '>r ' : '';
      return { align: want === align ? '' : want, block };
    });
  }
  return { text, selection: sel };
};

// Hook for a notes TextInput. Spread inputProps on the TextInput and pass
// apply to <FormatToolbar />.
export function useFormattedInput(value, setValue) {
  const [sel, setSel] = useState({ start: 0, end: 0 });
  const [forced, setForced] = useState(undefined);

  const inputProps = {
    value,
    onChangeText: setValue,
    selection: forced,
    onSelectionChange: (e) => {
      setSel(e.nativeEvent.selection);
      if (forced) setForced(undefined);
    }
  };

  const apply = (kind, arg) => {
    const current = value || '';
    const safe = {
      start: Math.min(sel.start, current.length),
      end: Math.min(sel.end, current.length)
    };
    const result = applyFormat(current, safe, kind, arg);
    setValue(result.text);
    setSel(result.selection);
    setForced(result.selection);
  };

  return { inputProps, apply };
}

// ---------- display ----------

const renderNodes = (nodes, keyPrefix, onLinkEdit) => nodes.map((n, i) => {
  const key = `${keyPrefix}-${i}`;
  if (n.type === 'text') return <Text key={key}>{n.value}</Text>;
  if (n.type === 'bold') return <Text key={key} style={styles.bold}>{renderNodes(n.children, key, onLinkEdit)}</Text>;
  if (n.type === 'italic') return <Text key={key} style={styles.italic}>{renderNodes(n.children, key, onLinkEdit)}</Text>;
  if (n.type === 'color') return <Text key={key} style={{ color: NOTE_COLORS[n.color] }}>{renderNodes(n.children, key, onLinkEdit)}</Text>;
  return (
    <Text key={key}>
      <Text style={styles.link} onPress={() => Linking.openURL(n.url)}>{n.label}</Text>
      {onLinkEdit ? <Text style={styles.linkEditIcon} onPress={() => onLinkEdit(n)}> ✎</Text> : null}
    </Text>
  );
});

const ALIGN = { l: 'left', c: 'center', r: 'right' };

// Renders formatted notes. `style` is the outer box, `textStyle` the text.
// Pass onLinkEdit to show a small pencil next to each link.
export function RichNotes({ text, style, textStyle, onLinkEdit }) {
  const lines = parseNotes(text);
  const base = textStyle || styles.baseText;
  return (
    <View style={style}>
      {lines.map((line, i) => {
        const alignStyle = { textAlign: ALIGN[line.align] };
        const body = line.kind === 'h'
          ? <Text style={styles.heading}>{renderNodes(line.nodes, `l${i}`, onLinkEdit)}</Text>
          : renderNodes(line.nodes, `l${i}`, onLinkEdit);
        if (line.kind === 'b') {
          return (
            <View key={i} style={styles.bulletRow}>
              <Text style={[base, styles.bulletDot]}>•</Text>
              <Text style={[base, styles.bulletText, alignStyle]}>{body}</Text>
            </View>
          );
        }
        return <Text key={i} style={[base, alignStyle]}>{line.nodes.length ? body : ' '}</Text>;
      })}
    </View>
  );
}

// Live preview under an input. Only shows when the text uses formatting.
export function NotesPreview({ text }) {
  if (!hasFormatting(text)) return null;
  return (
    <View style={styles.previewBox}>
      <Text style={styles.previewLabel}>Preview</Text>
      <RichNotes text={text} />
    </View>
  );
}

// ---------- toolbar ----------

const COLOR_KEYS = ['orange', 'green', 'red', 'gray'];

export function FormatToolbar({ apply, onDone }) {
  return (
    <View style={styles.toolbar}>
      <TouchableOpacity style={styles.tbBtn} onPress={() => apply('bold')}>
        <Text style={[styles.tbText, { fontWeight: '900' }]}>B</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tbBtn} onPress={() => apply('italic')}>
        <Text style={[styles.tbText, { fontStyle: 'italic', fontWeight: '700' }]}>I</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tbBtn} onPress={() => apply('bullet')}>
        <Text style={styles.tbText}>•</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tbBtn} onPress={() => apply('heading')}>
        <Text style={styles.tbText}>H</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tbPill} onPress={() => apply('align', 'left')}>
        <Text style={styles.tbPillText}>Left</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tbPill} onPress={() => apply('align', 'center')}>
        <Text style={styles.tbPillText}>Center</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tbPill} onPress={() => apply('align', 'right')}>
        <Text style={styles.tbPillText}>Right</Text>
      </TouchableOpacity>
      {COLOR_KEYS.map(c => (
        <TouchableOpacity key={c} style={styles.tbBtn} onPress={() => apply('color', c)}>
          <View style={[styles.tbDot, { backgroundColor: NOTE_COLORS[c] }]} />
        </TouchableOpacity>
      ))}
      {onDone ? (
        <TouchableOpacity style={[styles.tbPill, styles.tbDone]} onPress={onDone}>
          <Text style={[styles.tbPillText, { color: '#fff' }]}>Done</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  baseText: { fontSize: 13, color: '#1A1A1A', lineHeight: 18 },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  heading: { fontWeight: '800', fontSize: 15 },
  link: { color: '#F77E2D', textDecorationLine: 'underline', fontWeight: '600' },
  linkEditIcon: { color: '#888', fontSize: 12 },
  bulletRow: { flexDirection: 'row' },
  bulletDot: { width: 16 },
  bulletText: { flex: 1 },
  previewBox: { marginTop: 6, borderWidth: 1, borderColor: '#C5BFB4', borderRadius: 8, padding: 10 },
  previewLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' },
  tbBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#EDE8DF', justifyContent: 'center', alignItems: 'center' },
  tbText: { fontSize: 16, color: '#1A1A1A' },
  tbPill: { height: 34, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#EDE8DF', justifyContent: 'center', alignItems: 'center' },
  tbPillText: { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },
  tbDot: { width: 18, height: 18, borderRadius: 9 },
  tbDone: { backgroundColor: '#F77E2D' }
});