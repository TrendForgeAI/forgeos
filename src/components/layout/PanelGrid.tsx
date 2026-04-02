"use client";

import { useState, useEffect } from "react";
import SplitPane from "./SplitPane";
import TabGroup from "./TabGroup";
import { LayoutMode, LayoutState, GroupState, loadLayout, saveLayout, defaultLayout } from "./panel-types";

interface Props {
  activeProject: string | null;
  layout: LayoutMode;
  openFilePath?: string | null;
}

export default function PanelGrid({ activeProject, layout, openFilePath }: Props) {
  const [state, setState] = useState<LayoutState>(defaultLayout);

  useEffect(() => {
    setState(loadLayout());
  }, []);

  useEffect(() => {
    setState(s => ({ ...s, mode: layout }));
  }, [layout]);

  useEffect(() => {
    saveLayout(state);
  }, [state]);

  function updateGroupA(g: GroupState) {
    setState(s => ({ ...s, groupA: g }));
  }
  function updateGroupB(g: GroupState) {
    setState(s => ({ ...s, groupB: g }));
  }

  const groupA = (
    <TabGroup
      group={state.groupA}
      projectPath={activeProject}
      onGroupChange={updateGroupA}
      openFilePath={openFilePath}
    />
  );
  const groupB = (
    <TabGroup
      group={state.groupB}
      projectPath={activeProject}
      onGroupChange={updateGroupB}
    />
  );

  if (state.mode === "single") {
    return <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>{groupA}</div>;
  }

  return (
    <SplitPane
      direction={state.mode === "split-h" ? "horizontal" : "vertical"}
      ratio={state.splitRatio}
      onRatioChange={(r) => setState(s => ({ ...s, splitRatio: r }))}
      first={groupA}
      second={groupB}
    />
  );
}
