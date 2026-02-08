import { useEffect, useMemo, useRef, useState } from "react";
import { makeStyles } from "tss-react/mui";

import { AddPanelMenu } from "@lichtblick/suite-base/components/AppBar/AddPanelMenu";
import { BuiltinIcon } from "@lichtblick/suite-base/components/BuiltinIcon";
import { usePlayerSelection } from "@lichtblick/suite-base/context/PlayerSelectionContext";
import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";

import { buildFileUrl, fetchTree } from "./mcap/api";
import { FileTree } from "./mcap/FileTree";
import type { TreeNode } from "./mcap/types";

const useStyles = makeStyles()((theme) => ({
  root: {
    display: "grid",
    gridTemplateColumns: "240px minmax(0, 1fr)",
    height: "100vh",
    background: theme.palette.background.default,
    color: theme.palette.text.primary,
  },
  sidebar: {
    background: "#1f1f1f",
    color: "#f2f2f2",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: "12px 10px 14px",
    borderRight: "1px solid rgba(255, 255, 255, 0.08)",
  },
  sidebarHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  brand: {
    fontSize: 14,
    fontWeight: 600,
  },
  subBrand: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.55)",
    marginTop: 4,
  },
  ghostButton: {
    border: "1px solid rgba(255, 255, 255, 0.18)",
    background: "rgba(255, 255, 255, 0.06)",
    color: "inherit",
    padding: "4px 8px",
    borderRadius: 999,
    cursor: "pointer",
    fontSize: 11,
  },
  treePanel: {
    flex: 1,
    overflow: "auto",
    paddingRight: 4,
  },
  sectionTitle: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "rgba(255, 255, 255, 0.45)",
  },
  selectionPanel: {
    background: "rgba(255, 255, 255, 0.04)",
    padding: 10,
    borderRadius: 10,
    border: "1px solid rgba(255, 255, 255, 0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  toolsPanel: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  toolsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  toolButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    border: "1px solid rgba(255, 255, 255, 0.12)",
    background: "rgba(0, 0, 0, 0.35)",
    color: "inherit",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: "rgba(255, 255, 255, 0.28)",
      background: "rgba(255, 255, 255, 0.08)",
    },
  },
  toolIcon: {
    display: "inline-flex",
    "& svg": {
      width: 18,
      height: 18,
    },
  },
  selectionList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 12,
    fontFamily: "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  errorBanner: {
    fontSize: 11,
    color: "#f6b3b3",
    background: "rgba(255, 77, 77, 0.12)",
    border: "1px solid rgba(255, 77, 77, 0.25)",
    borderRadius: 8,
    padding: "6px 8px",
  },
  selectionItem: {
    background: "rgba(0, 0, 0, 0.35)",
    borderRadius: 8,
    padding: "6px 8px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  hint: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.55)",
  },
  empty: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.55)",
    padding: "8px 4px",
  },
  viewer: {
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  },
  viewerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "16px 20px 12px",
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  viewerTitle: {
    fontSize: 16,
    fontWeight: 600,
  },
  viewerSubtitle: {
    fontSize: 12,
    color: theme.palette.text.secondary,
    marginTop: 4,
  },
  workspace: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  workspaceBody: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },
  mobileStack: {
    [theme.breakpoints.down("md")]: {
      gridTemplateColumns: "1fr",
      gridTemplateRows: "auto 1fr",
    },
  },
}));

type Props = {
  children: React.JSX.Element;
};

export function McapPortalShell({ children }: Props) {
  const { classes, cx } = useStyles();
  const { selectSource } = usePlayerSelection();
  const { dialogActions, sidebarActions } = useWorkspaceActions();
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([""]));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addPanelAnchorEl, setAddPanelAnchorEl] = useState<HTMLElement | null>(null);
  const lastSelectionRef = useRef<string>("");

  const selectedPaths = useMemo(() => Array.from(selected).sort(), [selected]);
  const addPanelOpen = Boolean(addPanelAnchorEl);
  const resolveMcapPath = (path: string) => {
    const marker = ".mcap.";
    const index = path.toLowerCase().indexOf(marker);
    if (index === -1) {
      return path;
    }
    return `${path.slice(0, index + ".mcap".length)}`;
  };
  const selectedMcapPaths = useMemo(() => {
    const resolved = selectedPaths.map(resolveMcapPath);
    return Array.from(new Set(resolved)).sort();
  }, [selectedPaths]);

  const loadTree = async () => {
    setLoadError(null);
    try {
      const nextTree = await fetchTree();
      setTree(nextTree);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Load failed");
    }
  };

  useEffect(() => {
    loadTree();
  }, []);

  useEffect(() => {
    if (!selectedMcapPaths.length) {
      lastSelectionRef.current = "";
      return;
    }
    const urls = selectedMcapPaths.map((path) => buildFileUrl(path));
    const urlParam = urls.join(",");
    if (lastSelectionRef.current === urlParam) {
      return;
    }
    lastSelectionRef.current = urlParam;
    selectSource("remote-file", {
      type: "connection",
      params: {
        url: urlParam,
      },
    });
  }, [selectSource, selectedMcapPaths]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        ["o", "p", "k"].includes(event.key.toLowerCase())
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);

  const handleToggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSelect = (path: string, additive: boolean) => {
    setSelected((prev) => {
      const next = new Set(additive ? prev : []);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  return (
    <div className={cx(classes.root, classes.mobileStack)}>
      <aside className={classes.sidebar}>
        <div className={classes.sidebarHeader}>
          <div>
            <div className={classes.brand}>MCAP Navigator</div>
            <div className={classes.subBrand}>{tree?.name ?? "MCAP root"}</div>
          </div>
          <button className={classes.ghostButton} onClick={loadTree} type="button">
            Refresh
          </button>
        </div>

        <div>
          <div className={classes.sectionTitle}>Files</div>
        </div>

        <div className={classes.treePanel}>
          {tree ? (
            <FileTree
              node={tree}
              expanded={expanded}
              selected={selected}
              onToggle={handleToggle}
              onSelect={handleSelect}
            />
          ) : loadError ? (
            <div className={classes.empty}>{loadError}</div>
          ) : (
            <div className={classes.empty}>Loading...</div>
          )}
        </div>
        {loadError && tree && <div className={classes.errorBanner}>{loadError}</div>}

        <div className={classes.selectionPanel}>
          <div className={classes.sectionTitle}>Selected</div>
          {selectedPaths.length ? (
            <ul className={classes.selectionList}>
              {selectedPaths.map((path) => (
                <li key={path} className={classes.selectionItem}>
                  {path}
                </li>
              ))}
            </ul>
          ) : (
            <div className={classes.empty}>No MCAP selected</div>
          )}
          <div className={classes.hint}>
            {selectedPaths.length
              ? "Click a file to load it into Lichtblick."
              : "Pick an MCAP file to load the viewer."}
          </div>
        </div>

        <div className={classes.toolsPanel}>
          <div className={classes.sectionTitle}>Tools</div>
          <div className={classes.toolsRow}>
            <button
              className={classes.toolButton}
              onClick={(event) => {
                setAddPanelAnchorEl(event.currentTarget);
              }}
              type="button"
              id="add-panel-button"
              aria-label="Add panel"
              title="Add panel"
            >
              <span className={classes.toolIcon}>
                <BuiltinIcon name="RectangularClipping" />
              </span>
            </button>
            <button
              className={classes.toolButton}
              onClick={() => sidebarActions.left.selectItem("panel-settings")}
              type="button"
              aria-label="Panel settings"
              title="Panel settings"
            >
              <span className={classes.toolIcon}>
                <BuiltinIcon name="PanelSettings" />
              </span>
            </button>
            <button
              className={classes.toolButton}
              onClick={() => sidebarActions.left.selectItem("extensions")}
              type="button"
              aria-label="Extensions"
              title="Extensions"
            >
              <span className={classes.toolIcon}>
                <BuiltinIcon name="AddIn" />
              </span>
            </button>
            <button
              className={classes.toolButton}
              onClick={() => sidebarActions.left.selectItem("layouts")}
              type="button"
              aria-label="Layouts"
              title="Layouts"
            >
              <span className={classes.toolIcon}>
                <BuiltinIcon name="FiveTileGrid" />
              </span>
            </button>
            <button
              className={classes.toolButton}
              onClick={() => sidebarActions.left.selectItem("topics")}
              type="button"
              aria-label="Topics"
              title="Topics"
            >
              <span className={classes.toolIcon}>
                <BuiltinIcon name="Flow" />
              </span>
            </button>
            <button
              className={classes.toolButton}
              onClick={() => sidebarActions.left.selectItem("alerts")}
              type="button"
              aria-label="Alerts"
              title="Alerts"
            >
              <span className={classes.toolIcon}>
                <BuiltinIcon name="ErrorBadge" />
              </span>
            </button>
            <button
              className={classes.toolButton}
              onClick={() => sidebarActions.right.selectItem("variables")}
              type="button"
              aria-label="Variables"
              title="Variables"
            >
              <span className={classes.toolIcon}>
                <BuiltinIcon name="Variable2" />
              </span>
            </button>
            <button
              className={classes.toolButton}
              onClick={() => sidebarActions.right.selectItem("logs-settings")}
              type="button"
              aria-label="Logs"
              title="Logs"
            >
              <span className={classes.toolIcon}>
                <BuiltinIcon name="BacklogList" />
              </span>
            </button>
            <button
              className={classes.toolButton}
              onClick={() => dialogActions.preferences.open()}
              type="button"
              aria-label="App settings"
              title="App settings"
            >
              <span className={classes.toolIcon}>
                <BuiltinIcon name="Settings" />
              </span>
            </button>
          </div>
        </div>
      </aside>

      <main className={classes.viewer}>
        <div className={classes.viewerHeader}>
          <div>
            <div className={classes.viewerTitle}>Lichtblick</div>
            <div className={classes.viewerSubtitle}>
              {selectedMcapPaths.length
                ? `${selectedMcapPaths.length} file(s) loaded`
                : "Waiting for file selection"}
            </div>
          </div>
          <button
            className={classes.ghostButton}
            onClick={() => {
              if (selectedMcapPaths.length) {
                const urls = selectedMcapPaths.map((path) => buildFileUrl(path));
                selectSource("remote-file", {
                  type: "connection",
                  params: {
                    url: urls.join(","),
                  },
                });
              }
            }}
            type="button"
          >
            Reload
          </button>
        </div>
        <div className={classes.workspace}>
          <div className={classes.workspaceBody}>{children}</div>
        </div>
      </main>
      <AddPanelMenu
        anchorEl={addPanelAnchorEl ?? undefined}
        open={addPanelOpen}
        handleClose={() => {
          setAddPanelAnchorEl(null);
        }}
      />
    </div>
  );
}
