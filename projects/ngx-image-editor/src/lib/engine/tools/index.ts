import type { NieToolId } from '../../config/tokens';
import type { Tool } from './tool';
import { MoveTool } from './move';
import { TransformTool } from './transform';
import { CropTool, PanTool, ZoomTool } from './view';
import {
  TextTool,
  ShapeTool,
  BrushTool,
  EraserTool,
  SelectRectTool,
  SelectEllipseTool,
  EyedropperTool,
  FillTool,
  LassoTool,
  MagicWandTool,
  CloneTool,
  HealingTool,
} from './drawing';

export function createToolRegistry(): Map<NieToolId, Tool> {
  const tools: Tool[] = [
    new MoveTool(),
    new TransformTool(),
    new CropTool(),
    new PanTool(),
    new ZoomTool(),
    new TextTool(),
    new ShapeTool(),
    new BrushTool(),
    new EraserTool(),
    new SelectRectTool(),
    new SelectEllipseTool(),
    new LassoTool(),
    new MagicWandTool(),
    new CloneTool(),
    new HealingTool(),
    new EyedropperTool(),
    new FillTool(),
  ];
  return new Map(tools.map((t) => [t.id, t]));
}

export * from './tool';
export * from './move';
export * from './transform';
export * from './view';
export * from './drawing';
