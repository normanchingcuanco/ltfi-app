import { View, Text, Linking, StyleSheet } from 'react-native';

// Simple note formatting. Users type markers, the display renders them.
//   **bold**   *italic*   - bullet   # heading   {orange}text{/orange}
//   [Label](https://...) and bare https:// links
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
    let kind = 'p';
    let prefixLen = 0;
    const h = /^#\s+/.exec(line);
    const b = /^-\s+/.exec(line);
    if (h) {
      kind = 'h';
      prefixLen = h[0].length;
    } else if (b) {
      kind = 'b';
      prefixLen = b[0].length;
    }
    lines.push({ kind, nodes: parseInline(line.slice(prefixLen), offset + prefixLen) });
    offset += line.length + 1;
  });
  return lines;
};

const nodesHaveFormat = (nodes) => nodes.some(n => n.type === 'bold' || n.type === 'italic' || n.type === 'color');

export const hasFormatting = (text) =>
  !!text && parseNotes(text).some(l => l.kind !== 'p' || nodesHaveFormat(l.nodes));

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

// Renders formatted notes. Pass the text style you want as `style`.
// Pass onLinkEdit to show a small pencil next to each link.
export function RichNotes({ text, style, onLinkEdit }) {
  const lines = parseNotes(text);
  return (
    <Text style={style}>
      {lines.map((line, i) => (
        <Text key={i}>
          {i > 0 ? '\n' : ''}
          {line.kind === 'b' ? '•  ' : ''}
          {line.kind === 'h'
            ? <Text style={styles.heading}>{renderNodes(line.nodes, `l${i}`, onLinkEdit)}</Text>
            : renderNodes(line.nodes, `l${i}`, onLinkEdit)}
        </Text>
      ))}
    </Text>
  );
}

// Live preview under an input. Only shows when the text uses formatting.
export function NotesPreview({ text }) {
  if (!hasFormatting(text)) return null;
  return (
    <View style={styles.previewBox}>
      <Text style={styles.previewLabel}>Preview</Text>
      <RichNotes text={text} style={styles.previewText} />
    </View>
  );
}

const HINT = 'Format: **bold**  *italic*  - bullet  # heading  {orange}text{/orange}  (orange, green, red, gray)';

export function FormatHint() {
  return <Text style={styles.hint}>{HINT}</Text>;
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  heading: { fontWeight: '800', fontSize: 15 },
  link: { color: '#F77E2D', textDecorationLine: 'underline', fontWeight: '600' },
  linkEditIcon: { color: '#888', fontSize: 12 },
  previewBox: { marginTop: 6, borderWidth: 1, borderColor: '#C5BFB4', borderRadius: 8, padding: 10 },
  previewLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  previewText: { fontSize: 13, color: '#1A1A1A', lineHeight: 18 },
  hint: { fontSize: 11, color: '#888', marginTop: 6, lineHeight: 15 }
});