'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { InvitationSection } from '@/lib/cms';
import { SECTION_TYPE_LABELS } from '@/lib/cms';
import { Reorder, useDragControls } from 'motion/react';

interface SectionListProps {
  sections: InvitationSection[];
  onReorder: (sectionId: string, position: number) => Promise<void>;
  onToggleActive: (sectionId: string, isActive: boolean) => void;
}

export function SectionList({ sections, onReorder, onToggleActive }: SectionListProps) {
  const coverSection = sections.find((s) => s.section_type === 'cover');
  const otherSections = sections.filter((s) => s.section_type !== 'cover');

  const [localSections, setLocalSections] = useState<InvitationSection[]>(otherSections);
  const draggedIdRef = useRef<string | null>(null);

  useEffect(() => {
    setLocalSections(sections.filter((s) => s.section_type !== 'cover'));
  }, [sections]);

  return (
    <div className="space-y-2">
      {/* 1. Static Locked Cover Section (Position 1) */}
      {coverSection && (
        <div
          role="listitem"
          className={`flex items-center gap-3 rounded-xl border bg-gray-50/80 border-gray-200 p-4 shadow-sm select-none ${
            !coverSection.is_active ? 'opacity-60' : ''
          }`}
        >
          {/* Locked Icon (No drag handle) */}
          <div
            className="flex items-center text-gray-400 p-1"
            aria-label="Section terkunci di posisi pertama"
            title="Section ini dikunci di posisi pertama"
          >
            <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          {/* Sort order badge */}
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-500">
            1
          </span>

          {/* Section info */}
          <div className="flex-1 min-w-0">
            <Link
              href={`/cms/edit/${coverSection.id}`}
              className="text-sm font-medium text-gray-900 hover:text-primary transition-colors font-semibold"
            >
              {SECTION_TYPE_LABELS[coverSection.section_type]}
            </Link>
            <p className="text-xs text-gray-500 truncate">
              {coverSection.is_active ? 'Aktif' : 'Nonaktif'} • Diperbarui{' '}
              {new Date(coverSection.updated_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* Toggle active */}
          <label className="relative inline-flex cursor-pointer items-center" aria-label={`${coverSection.is_active ? 'Nonaktifkan' : 'Aktifkan'} section ${SECTION_TYPE_LABELS[coverSection.section_type]}`}>
            <input
              type="checkbox"
              checked={coverSection.is_active}
              onChange={(e) => onToggleActive(coverSection.id, e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-primary/20" />
          </label>

          {/* Edit button */}
          <Link
            href={`/cms/edit/${coverSection.id}`}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label={`Edit section ${SECTION_TYPE_LABELS[coverSection.section_type]}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Link>
        </div>
      )}

      {/* 2. Drag-and-drop Reorderable Group for the remaining 13 Sections (Position 2..14) */}
      <Reorder.Group
        values={localSections}
        onReorder={setLocalSections}
        axis="y"
        className="space-y-2"
        as="div"
        role="list"
        aria-label="Daftar section undangan"
      >
        {localSections.map((section) => (
          <SectionItem
            key={section.id}
            section={section}
            sections={otherSections}
            localSections={localSections}
            draggedIdRef={draggedIdRef}
            onReorder={onReorder}
            onToggleActive={onToggleActive}
            setLocalSections={setLocalSections}
          />
        ))}
      </Reorder.Group>
    </div>
  );
}

interface SectionItemProps {
  section: InvitationSection;
  sections: InvitationSection[];
  localSections: InvitationSection[];
  draggedIdRef: React.MutableRefObject<string | null>;
  onReorder: (sectionId: string, position: number) => Promise<void>;
  onToggleActive: (sectionId: string, isActive: boolean) => void;
  setLocalSections: React.Dispatch<React.SetStateAction<InvitationSection[]>>;
}

function SectionItem({
  section,
  sections,
  localSections,
  draggedIdRef,
  onReorder,
  onToggleActive,
  setLocalSections,
}: SectionItemProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={section}
      id={section.id}
      dragListener={false}
      dragControls={dragControls}
      as="div"
      role="listitem"
      onDragStart={() => {
        draggedIdRef.current = section.id;
      }}
      onDragEnd={async () => {
        const hasOrderChanged = localSections.some(
          (sec, idx) => sec.id !== sections[idx]?.id
        );
        if (hasOrderChanged && draggedIdRef.current) {
          const draggedId = draggedIdRef.current;
          const newIndex = localSections.findIndex((s) => s.id === draggedId);
          try {
            // Position starts at 2 because Cover is locked at position 1
            await onReorder(draggedId, newIndex + 2);
          } catch (err) {
            // Revert on error
            setLocalSections(sections);
          }
        }
        draggedIdRef.current = null;
      }}
      className={`flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm transition-colors border-gray-200 select-none ${
        !section.is_active ? 'opacity-60' : ''
      }`}
    >
      {/* Drag handle */}
      <div
        className="flex cursor-grab items-center text-gray-400 hover:text-gray-600 active:cursor-grabbing p-1"
        aria-label="Seret untuk mengubah urutan"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Sort order badge */}
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
        {section.sort_order}
      </span>

      {/* Section info */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/cms/edit/${section.id}`}
          className="text-sm font-medium text-gray-900 hover:text-primary transition-colors font-semibold"
        >
          {SECTION_TYPE_LABELS[section.section_type]}
        </Link>
        <p className="text-xs text-gray-500 truncate">
          {section.is_active ? 'Aktif' : 'Nonaktif'} • Diperbarui{' '}
          {new Date(section.updated_at).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Toggle active */}
      <label className="relative inline-flex cursor-pointer items-center" aria-label={`${section.is_active ? 'Nonaktifkan' : 'Aktifkan'} section ${SECTION_TYPE_LABELS[section.section_type]}`}>
        <input
          type="checkbox"
          checked={section.is_active}
          onChange={(e) => onToggleActive(section.id, e.target.checked)}
          className="peer sr-only"
        />
        <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-primary/20" />
      </label>

      {/* Edit button */}
      <Link
        href={`/cms/edit/${section.id}`}
        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        aria-label={`Edit section ${SECTION_TYPE_LABELS[section.section_type]}`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </Link>
    </Reorder.Item>
  );
}
