import type { JSX } from 'solid-js';
import { Dialog } from '@kobalte/core/dialog';
import { Tooltip } from '@kobalte/core/tooltip';
import { X } from 'lucide-solid';

export function IconButton(props: { label: string; children: JSX.Element; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return <Tooltip openDelay={500}><Tooltip.Trigger class={`icon-button ${props.active ? 'active' : ''}`} aria-label={props.label} disabled={props.disabled} onClick={props.onClick}>{props.children}</Tooltip.Trigger><Tooltip.Portal><Tooltip.Content class="tooltip">{props.label}</Tooltip.Content></Tooltip.Portal></Tooltip>;
}

export function EditorDialog(props: { open: boolean; title: string; onClose: () => void; children: JSX.Element }) {
  return <Dialog open={props.open} onOpenChange={open => { if (!open) props.onClose(); }}><Dialog.Portal><Dialog.Overlay class="modal-backdrop"/><div class="modal-positioner"><Dialog.Content class="modal"><Dialog.Title class="sr-only">{props.title}</Dialog.Title><Dialog.CloseButton class="modal-close icon-button" aria-label="Close"><X size={18}/></Dialog.CloseButton>{props.children}</Dialog.Content></div></Dialog.Portal></Dialog>;
}
