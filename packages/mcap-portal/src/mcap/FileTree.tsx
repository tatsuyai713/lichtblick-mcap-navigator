import type { MouseEvent } from "react";
import { makeStyles } from "tss-react/mui";

import type { TreeNode } from "./types";

const useStyles = makeStyles()(() => ({
  tree: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    transition: "background 0.2s ease",
  },
  rowSelected: {
    background: "rgba(255, 255, 255, 0.12)",
    outline: "1px solid rgba(255, 255, 255, 0.25)",
  },
  rowHover: {
    "&:hover": {
      background: "rgba(255, 255, 255, 0.08)",
    },
  },
  toggle: {
    width: 24,
    height: 24,
    border: "none",
    background: "transparent",
    color: "inherit",
    fontSize: 14,
    cursor: "pointer",
  },
  togglePlaceholder: {
    width: 24,
    height: 24,
    display: "inline-block",
  },
  label: {
    flex: 1,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "none",
    background: "transparent",
    color: "inherit",
    textAlign: "left",
    padding: "6px 8px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 13,
  },
  labelFolder: {
    fontWeight: 600,
  },
  icon: {
    width: 10,
    height: 10,
    borderRadius: 3,
    background: "rgba(255, 255, 255, 0.6)",
  },
  iconFile: {
    background: "rgba(255, 255, 255, 0.35)",
  },
  name: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
}));

type Props = {
  node: TreeNode;
  expanded: Set<string>;
  selected: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string, additive: boolean) => void;
};

function TreeRow({
  node,
  depth,
  expanded,
  selected,
  onToggle,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  selected: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string, additive: boolean) => void;
}) {
  const { classes, cx } = useStyles();
  const isFolder = node.type === "folder";
  const isExpanded = expanded.has(node.path);
  const isSelected = selected.has(node.path);

  const handleToggle = () => {
    if (isFolder) onToggle(node.path);
  };

  const handleSelect = (event: MouseEvent) => {
    if (!isFolder) {
      onSelect(node.path, event.metaKey || event.ctrlKey);
    }
  };

  return (
    <div>
      <div
        className={cx(classes.row, classes.rowHover, isSelected && classes.rowSelected)}
        style={{ paddingLeft: depth * 16 + 8 }}
      >
        {isFolder ? (
          <button
            className={classes.toggle}
            onClick={handleToggle}
            aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
            type="button"
          >
            {isExpanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className={classes.togglePlaceholder} />
        )}
        <button
          className={cx(classes.label, isFolder && classes.labelFolder)}
          onClick={isFolder ? handleToggle : handleSelect}
          type="button"
        >
          <span
            className={cx(classes.icon, !isFolder && classes.iconFile)}
            aria-hidden="true"
          />
          <span className={classes.name}>{node.name}</span>
        </button>
      </div>
      {isFolder && isExpanded && node.children?.length
        ? node.children.map((child) => (
            <TreeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selected={selected}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  );
}

export function FileTree({ node, expanded, selected, onToggle, onSelect }: Props) {
  const { classes } = useStyles();

  return (
    <div className={classes.tree}>
      <TreeRow
        node={node}
        depth={0}
        expanded={expanded}
        selected={selected}
        onToggle={onToggle}
        onSelect={onSelect}
      />
    </div>
  );
}
