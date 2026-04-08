import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useDndContext,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { CollisionDetection } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import {
  FiEdit2,
  FiFolderPlus,
  FiPlus,
  FiTrash2,
  FiExternalLink,
} from 'react-icons/fi';
import { VscGripper } from 'react-icons/vsc';
import type { RaidPlan, RaidPlanCategory, RaidPlanLayout } from '../types/raidPlan';
import type { RaidTierSummary } from '../types/raidTier';
import { useAuth } from '../contexts/AuthContext';
import { raidPlanService } from '../services/api/raidPlanService';
import { raidTierService } from '../services/api/raidTierService';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RaidPlanViewerDialog } from '../components/RaidPlanViewerDialog';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { signalRService } from '../services/signalrService';
import './RaidPlansPage.css';

const RAID_PLANS_TIER_STORAGE_KEY = 'ffxivloot.raidPlans.tierId';

/** Prefix for sortable fight column ids (avoids clashing with plan/category droppable ids). */
const FIGHT_SORT_PREFIX = 'fight::';

/** Prefer pointer-inside targets for clearer category hover; fall back to closest corners. */
const raidPlansCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) return pointerHits;
  return closestCorners(args);
};

function rootCategoriesSorted(categories: RaidPlanCategory[]): RaidPlanCategory[] {
  return [...categories]
    .filter((c) => !c.parentCategoryId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function subcategoriesOf(parentId: string, categories: RaidPlanCategory[]): RaidPlanCategory[] {
  return [...categories]
    .filter((c) => c.parentCategoryId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Keeps root category droppable when Uncategorized is empty but phases exist. */
function RootUncategorizedDropZone({
  categoryId,
  plansById,
  items: itemsMap,
}: {
  categoryId: string;
  plansById: Record<string, RaidPlan>;
  items: Record<string, string[]>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: categoryId });
  const { active, over, collisions } = useDndContext();
  const isPlanDrag = !!(active && plansById[String(active.id)]);
  const candidateIds = new Set<string>();
  if (over?.id != null) candidateIds.add(String(over.id));
  if (collisions) {
    for (const c of collisions) {
      if (c.id != null) candidateIds.add(String(c.id));
    }
  }
  const hitsUncategorized = Array.from(candidateIds).some(
    (oid) => oid === categoryId || findContainer(oid, itemsMap) === categoryId
  );
  const isExpanded = isPlanDrag && (isOver || hitsUncategorized);
  return (
    <div
      ref={setNodeRef}
      className={`raid-plans-uncategorized-empty-drop${isExpanded ? ' raid-plans-drop-target-active raid-plans-drop-target-expand' : ''}`}
    />
  );
}

function findContainer(id: string, items: Record<string, string[]>): string | undefined {
  if (id in items) return id;
  for (const [containerId, ids] of Object.entries(items)) {
    if (ids.includes(id)) return containerId;
  }
  return undefined;
}

function buildItemsFromLayout(layout: RaidPlanLayout): Record<string, string[]> {
  const cats = [...layout.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const next: Record<string, string[]> = {};
  for (const c of cats) {
    next[c.id] = layout.plans
      .filter((p) => p.categoryId === c.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => p.id);
  }
  return next;
}

function SortablePlanRow({
  plan,
  onOpen,
  onEdit,
  onRemove,
}: {
  plan: RaidPlan;
  onOpen: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: plan.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const slideCount = plan.slides?.length ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`raid-plans-sortable-row${isDragging ? ' raid-plans-sortable-row--dragging' : ''}`}
    >
      <button type="button" className="raid-plans-sortable-grip" aria-label="Drag to reorder" {...attributes} {...listeners}>
        <VscGripper />
      </button>
      <div
        className="raid-plans-sortable-body"
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen();
          }
        }}
      >
        <span className="raid-plans-sortable-title">{plan.title}</span>
        <span className="raid-plans-sortable-meta">
          {slideCount === 1 ? '1 slide' : `${slideCount} slides`}
        </span>
      </div>
      <div className="raid-plans-sortable-actions">
        <Tooltip title="Edit">
          <IconButton size="small" onClick={onEdit} aria-label="Edit plan">
            <FiEdit2 />
          </IconButton>
        </Tooltip>
        <Tooltip title="Open on RaidPlan.io">
          <IconButton
            size="small"
            component="a"
            href={plan.raidplanUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open on RaidPlan.io"
          >
            <FiExternalLink />
          </IconButton>
        </Tooltip>
        <Tooltip title="Remove">
          <IconButton size="small" color="error" onClick={onRemove} aria-label="Remove plan">
            <FiTrash2 />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
}

function PlanCategorySection({
  category,
  title,
  planIds,
  items: itemsMap,
  plansById,
  onOpen,
  onEdit,
  onRemove,
  onEditCategory,
  onDeleteCategory,
  headMode,
}: {
  category: RaidPlanCategory;
  title: string;
  planIds: string[];
  items: Record<string, string[]>;
  plansById: Record<string, RaidPlan>;
  onOpen: (id: string) => void;
  onEdit: (p: RaidPlan) => void;
  onRemove: (p: RaidPlan) => void;
  onEditCategory: (c: RaidPlanCategory) => void;
  onDeleteCategory: (c: RaidPlanCategory) => void;
  headMode: 'none' | 'sub' | 'general';
}) {
  const isSubSortable = headMode === 'sub';
  const { active, over, collisions } = useDndContext();
  const isPlanDrag = !!(active && plansById[String(active.id)]);
  /** Resolve primary + collision targets so padding/gaps still count (not only the first rect hit). */
  const isOverThisCategory = (() => {
    if (!isPlanDrag) return false;
    const candidateIds = new Set<string>();
    if (over?.id != null) candidateIds.add(String(over.id));
    if (collisions) {
      for (const c of collisions) {
        if (c.id != null) candidateIds.add(String(c.id));
      }
    }
    for (const oid of Array.from(candidateIds)) {
      if (oid === category.id || findContainer(oid, itemsMap) === category.id) return true;
    }
    return false;
  })();
  const { setNodeRef: setDropRef } = useDroppable({ id: category.id, disabled: isSubSortable });
  const {
    attributes: subSortAttributes,
    listeners: subSortListeners,
    setNodeRef: setSortRef,
    transform: subTransform,
    transition: subTransition,
    isDragging: isSubDragging,
  } = useSortable({ id: category.id, disabled: !isSubSortable });

  const setRefs = (el: HTMLDivElement | null) => {
    setDropRef(el);
    setSortRef(el);
  };

  const subStyle = isSubSortable
    ? {
        transform: CSS.Transform.toString(subTransform),
        transition: subTransition,
      }
    : undefined;

  return (
    <div
      ref={setRefs}
      style={subStyle}
      className={`${headMode === 'none' ? 'raid-plans-fight-plans' : 'raid-plans-subcategory-block'}${
        isSubSortable && isSubDragging ? ' raid-plans-subcategory-block--dragging' : ''
      }`}
    >
      {headMode === 'sub' && (
        <div className="raid-plans-subcategory-head">
          <button
            type="button"
            className="raid-plans-subcategory-sort-grip"
            aria-label="Drag to reorder phase"
            {...subSortListeners}
            {...subSortAttributes}
          >
            <VscGripper />
          </button>
          <h3 className="raid-plans-subcategory-title">{title}</h3>
          <div className="raid-plans-category-head-actions">
            <Tooltip title="Rename">
              <IconButton size="small" onClick={() => onEditCategory(category)} aria-label={`Rename ${title}`}>
                <FiEdit2 />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete subcategory">
              <IconButton size="small" color="error" onClick={() => onDeleteCategory(category)} aria-label={`Delete ${title}`}>
                <FiTrash2 />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      )}
      {headMode === 'general' && <div className="raid-plans-general-label">{title}</div>}
      <SortableContext items={planIds} strategy={verticalListSortingStrategy}>
        {planIds.length > 0 ? (
          <div
            className={`raid-plans-category-list${isOverThisCategory ? ' raid-plans-drop-target-active' : ''}`}
          >
            {planIds.map((id) => {
              const p = plansById[id];
              if (!p) return null;
              return (
                <SortablePlanRow
                  key={id}
                  plan={p}
                  onOpen={() => onOpen(id)}
                  onEdit={() => onEdit(p)}
                  onRemove={() => onRemove(p)}
                />
              );
            })}
          </div>
        ) : headMode === 'sub' || headMode === 'general' ? (
          <div
            className={`raid-plans-category-drop-slot${isOverThisCategory ? ' raid-plans-drop-target-active raid-plans-drop-target-expand' : ''}`}
            aria-hidden
          />
        ) : (
          <div className="raid-plans-category-list">
            <div
              className={`raid-plans-category-empty${isOverThisCategory ? ' raid-plans-category-empty--drag-active' : ''}`}
            >
              Click the &quot;+&quot; to add a new plan
            </div>
          </div>
        )}
      </SortableContext>
    </div>
  );
}

function FightColumn({
  root,
  subs,
  items,
  plansById,
  onOpen,
  onEdit,
  onRemove,
  onEditCategory,
  onDeleteCategory,
  onAddSubcategory,
  onAddPlan,
  addPlanDisabled,
  fightSortListeners,
  fightSortAttributes,
}: {
  root: RaidPlanCategory;
  subs: RaidPlanCategory[];
  items: Record<string, string[]>;
  plansById: Record<string, RaidPlan>;
  onOpen: (id: string) => void;
  onEdit: (p: RaidPlan) => void;
  onRemove: (p: RaidPlan) => void;
  onEditCategory: (c: RaidPlanCategory) => void;
  onDeleteCategory: (c: RaidPlanCategory) => void;
  onAddSubcategory: (parent: RaidPlanCategory) => void;
  onAddPlan: (categoryId: string) => void;
  addPlanDisabled: boolean;
  fightSortListeners?: ReturnType<typeof useSortable>['listeners'];
  fightSortAttributes?: ReturnType<typeof useSortable>['attributes'];
}) {
  const hasSubs = subs.length > 0;
  const rootPlanIds = items[root.id] ?? [];

  return (
    <section className="raid-plans-fight-column">
      <div className="raid-plans-fight-head">
        {fightSortListeners && fightSortAttributes && (
          <button
            type="button"
            className="raid-plans-fight-sort-grip"
            aria-label="Drag to reorder fight column"
            {...fightSortListeners}
            {...fightSortAttributes}
          >
            <VscGripper />
          </button>
        )}
        <h2 className="raid-plans-fight-title">{root.name}</h2>
        <div className="raid-plans-category-head-actions">
          <Tooltip title="Add raidplan">
            <span>
              <IconButton
                size="small"
                onClick={() => onAddPlan(root.id)}
                disabled={addPlanDisabled}
                aria-label={`Add raidplan to ${root.name}`}
              >
                <FiPlus />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Add subcategory (e.g. phase)">
            <span>
              <IconButton
                size="small"
                onClick={() => onAddSubcategory(root)}
                aria-label={`Add subcategory under ${root.name}`}
              >
                <FiFolderPlus />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Rename">
            <IconButton size="small" onClick={() => onEditCategory(root)} aria-label={`Rename ${root.name}`}>
              <FiEdit2 />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => onDeleteCategory(root)} aria-label={`Delete ${root.name}`}>
              <FiTrash2 />
            </IconButton>
          </Tooltip>
        </div>
      </div>
      {!hasSubs ? (
        <PlanCategorySection
          headMode="none"
          category={root}
          title=""
          planIds={rootPlanIds}
          items={items}
          plansById={plansById}
          onOpen={onOpen}
          onEdit={onEdit}
          onRemove={onRemove}
          onEditCategory={onEditCategory}
          onDeleteCategory={onDeleteCategory}
        />
      ) : (
        <div className="raid-plans-fight-subsections">
          <SortableContext items={subs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {subs.map((sub) => (
              <PlanCategorySection
                key={sub.id}
                headMode="sub"
                category={sub}
                title={sub.name}
                planIds={items[sub.id] ?? []}
                items={items}
                plansById={plansById}
                onOpen={onOpen}
                onEdit={onEdit}
                onRemove={onRemove}
                onEditCategory={onEditCategory}
                onDeleteCategory={onDeleteCategory}
              />
            ))}
          </SortableContext>
          {rootPlanIds.length > 0 ? (
            <PlanCategorySection
              headMode="general"
              category={root}
              title="Uncategorized"
              planIds={rootPlanIds}
              items={items}
              plansById={plansById}
              onOpen={onOpen}
              onEdit={onEdit}
              onRemove={onRemove}
              onEditCategory={onEditCategory}
              onDeleteCategory={onDeleteCategory}
            />
          ) : (
            <RootUncategorizedDropZone categoryId={root.id} plansById={plansById} items={items} />
          )}
        </div>
      )}
    </section>
  );
}

function SortableFightColumn(
  props: Omit<React.ComponentProps<typeof FightColumn>, 'fightSortListeners' | 'fightSortAttributes'>
) {
  const { root, ...rest } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${FIGHT_SORT_PREFIX}${root.id}`,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`raid-plans-fight-sortable${isDragging ? ' raid-plans-fight-sortable--dragging' : ''}`}
    >
      <FightColumn root={root} {...rest} fightSortListeners={listeners} fightSortAttributes={attributes} />
    </div>
  );
}

/**
 * Raid plans: extracted slides from RaidPlan.io, grouped by category, with drag-and-drop.
 */
export const RaidPlansPage: React.FC = () => {
  const { user } = useAuth();
  const { toasts, showToast, removeToast } = useToast();

  const [tierList, setTierList] = useState<RaidTierSummary[]>([]);
  const [raidTierId, setRaidTierId] = useState<string | null>(null);
  const [tiersLoading, setTiersLoading] = useState(true);

  const [layout, setLayout] = useState<RaidPlanLayout | null>(null);
  const [items, setItems] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const [activeId, setActiveId] = useState<string | null>(null);

  const [viewerPlanId, setViewerPlanId] = useState<string | null>(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planDialogMode, setPlanDialogMode] = useState<'create' | 'edit'>('create');
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planTitle, setPlanTitle] = useState('');
  const [planUrl, setPlanUrl] = useState('');
  const [planCategoryId, setPlanCategoryId] = useState<string>('');
  const [planSaving, setPlanSaving] = useState(false);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryDialogMode, setCategoryDialogMode] = useState<'create' | 'edit'>('create');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryParentId, setCategoryParentId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);

  const [pendingDeletePlan, setPendingDeletePlan] = useState<RaidPlan | null>(null);
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<RaidPlanCategory | null>(null);

  const plansById = useMemo(() => {
    const m: Record<string, RaidPlan> = {};
    if (!layout) return m;
    for (const p of layout.plans) m[p.id] = p;
    return m;
  }, [layout]);

  const rootCategories = useMemo(() => {
    if (!layout) return [];
    return rootCategoriesSorted(layout.categories);
  }, [layout]);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!raidTierId) return;
    const silent = options?.silent === true;
    if (!silent) setLoading(true);
    try {
      const data = await raidPlanService.getLayout(raidTierId);
      setLayout(data);
      setItems(buildItemsFromLayout(data));
    } catch (e) {
      if (!silent) {
        showToast(e instanceof Error ? e.message : 'Could not load raidplans', 'error');
        setLayout(null);
        setItems({});
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [raidTierId, showToast]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!user || !raidTierId) return;
    const mountedRef = { current: true };
    const onRaidPlansLayoutChanged = (tierId: string) => {
      if (!mountedRef.current || tierId !== raidTierId) return;
      void loadRef.current({ silent: true });
    };
    const setup = async () => {
      try {
        await signalRService.start();
        signalRService.onRaidPlansLayoutChanged(onRaidPlansLayoutChanged);
      } catch (e) {
        console.error('Raidplans: SignalR connection failed', e);
      }
    };
    void setup();
    return () => {
      mountedRef.current = false;
      signalRService.offRaidPlansLayoutChanged(onRaidPlansLayoutChanged);
    };
  }, [user, raidTierId]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setTiersLoading(true);
      try {
        const list = await raidTierService.list();
        if (cancelled) return;
        setTierList(list);
        const stored = sessionStorage.getItem(RAID_PLANS_TIER_STORAGE_KEY);
        const id =
          stored && list.some((t) => t.id === stored)
            ? stored
            : list.find((t) => t.isCurrent)?.id ?? list[0]?.id ?? null;
        setRaidTierId(id);
      } catch (e) {
        if (!cancelled) showToast(e instanceof Error ? e.message : 'Could not load raid tiers', 'error');
      } finally {
        if (!cancelled) setTiersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, showToast]);

  useEffect(() => {
    if (!user || !raidTierId) return;
    sessionStorage.setItem(RAID_PLANS_TIER_STORAGE_KEY, raidTierId);
    setViewerPlanId(null);
    void load();
  }, [user, raidTierId, load]);

  useEffect(() => {
    if (viewerPlanId && !plansById[viewerPlanId]) setViewerPlanId(null);
  }, [viewerPlanId, plansById]);

  const persistReorder = useCallback(
    async (nextItems: Record<string, string[]>) => {
      if (!raidTierId || !layout) return;
      const plans: { id: string; categoryId: string; sortOrder: number }[] = [];
      for (const c of layout.categories) {
        const ids = nextItems[c.id] ?? [];
        ids.forEach((id, index) => {
          plans.push({ id, categoryId: c.id, sortOrder: index });
        });
      }
      try {
        await raidPlanService.reorder(raidTierId, { plans });
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Could not save order', 'error');
        void load();
      }
    },
    [raidTierId, layout, showToast, load]
  );

  const persistRootCategoryOrder = useCallback(
    async (newRootOrder: string[]) => {
      if (!raidTierId || !layout) return;
      const categoriesPayload = layout.categories.map((c) => {
        if (!c.parentCategoryId) {
          const i = newRootOrder.indexOf(c.id);
          if (i >= 0) return { id: c.id, sortOrder: i };
        }
        return { id: c.id, sortOrder: c.sortOrder };
      });
      try {
        await raidPlanService.reorder(raidTierId, { categories: categoriesPayload });
        await load();
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Could not save category order', 'error');
        void load();
      }
    },
    [raidTierId, layout, load, showToast]
  );

  const persistSubcategoryOrder = useCallback(
    async (parentId: string, newSiblingOrder: string[]) => {
      if (!raidTierId || !layout) return;
      const categoriesPayload = layout.categories.map((c) => {
        if (c.parentCategoryId === parentId) {
          const i = newSiblingOrder.indexOf(c.id);
          if (i >= 0) return { id: c.id, sortOrder: i };
        }
        return { id: c.id, sortOrder: c.sortOrder };
      });
      try {
        await raidPlanService.reorder(raidTierId, { categories: categoriesPayload });
        await load();
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Could not save phase order', 'error');
        void load();
      }
    },
    [raidTierId, layout, load, showToast]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    if (activeIdStr === overIdStr) return;

    if (activeIdStr.startsWith(FIGHT_SORT_PREFIX)) {
      if (!overIdStr.startsWith(FIGHT_SORT_PREFIX)) return;
      const rootId = activeIdStr.slice(FIGHT_SORT_PREFIX.length);
      const overRootId = overIdStr.slice(FIGHT_SORT_PREFIX.length);
      const order = rootCategories.map((r) => r.id);
      const oldIdx = order.indexOf(rootId);
      const newIdx = order.indexOf(overRootId);
      if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return;
      void persistRootCategoryOrder(arrayMove(order, oldIdx, newIdx));
      return;
    }

    if (plansById[activeIdStr]) {
      setItems((prev) => {
        const activeContainer = findContainer(activeIdStr, prev);
        const overContainer = findContainer(overIdStr, prev);
        if (!activeContainer || !overContainer) return prev;

        let next: Record<string, string[]>;

        if (activeContainer === overContainer) {
          const list = prev[activeContainer];
          const oldIndex = list.indexOf(activeIdStr);
          const newIndex = list.indexOf(overIdStr);
          if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return prev;
          next = {
            ...prev,
            [activeContainer]: arrayMove(list, oldIndex, newIndex),
          };
        } else {
          const from = [...prev[activeContainer]];
          const to = [...prev[overContainer]];
          const fromIdx = from.indexOf(activeIdStr);
          if (fromIdx < 0) return prev;
          const [moved] = from.splice(fromIdx, 1);
          let insertAt: number;
          if (overIdStr === overContainer) {
            insertAt = to.length;
          } else {
            const idx = to.indexOf(overIdStr);
            insertAt = idx >= 0 ? idx : to.length;
          }
          to.splice(insertAt, 0, moved);
          next = {
            ...prev,
            [activeContainer]: from,
            [overContainer]: to,
          };
        }
        void persistReorder(next);
        return next;
      });
      return;
    }

    if (layout) {
      const activeCat = layout.categories.find((c) => c.id === activeIdStr);
      if (activeCat?.parentCategoryId) {
        const pid = activeCat.parentCategoryId;
        const overCat = layout.categories.find((c) => c.id === overIdStr);
        if (!overCat || overCat.parentCategoryId !== pid) return;
        const siblings = subcategoriesOf(pid, layout.categories).map((s) => s.id);
        const oldIdx = siblings.indexOf(activeIdStr);
        const newIdx = siblings.indexOf(overIdStr);
        if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return;
        void persistSubcategoryOrder(pid, arrayMove(siblings, oldIdx, newIdx));
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const openCreatePlanForCategory = (categoryId: string) => {
    setPlanDialogMode('create');
    setEditingPlanId(null);
    setPlanTitle('');
    setPlanUrl('');
    setPlanCategoryId(categoryId);
    setPlanDialogOpen(true);
  };

  const openEditPlan = (p: RaidPlan) => {
    setPlanDialogMode('edit');
    setEditingPlanId(p.id);
    setPlanTitle(p.title);
    setPlanUrl(p.raidplanUrl);
    setPlanCategoryId(p.categoryId);
    setPlanDialogOpen(true);
  };

  const submitPlanDialog = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = planTitle.trim();
    const u = planUrl.trim();
    if (!t || !u) {
      showToast('Title and RaidPlan URL are required.', 'error');
      return;
    }
    if (!planCategoryId) {
      showToast('Category is missing; close the dialog and use the + button on the fight header.', 'error');
      return;
    }
    if (!raidTierId) return;
    setPlanSaving(true);
    try {
      if (planDialogMode === 'create') {
        await raidPlanService.create(raidTierId, {
          title: t,
          raidplanUrl: u,
          categoryId: planCategoryId,
        });
        showToast('Raidplan saved.');
      } else if (editingPlanId) {
        await raidPlanService.update(raidTierId, editingPlanId, {
          title: t,
          raidplanUrl: u,
          categoryId: planCategoryId,
        });
        showToast('Raidplan updated.');
      }
      setPlanDialogOpen(false);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save', 'error');
    } finally {
      setPlanSaving(false);
    }
  };

  const openCreateCategory = () => {
    setCategoryDialogMode('create');
    setEditingCategoryId(null);
    setCategoryParentId(null);
    setCategoryName('');
    setCategoryDialogOpen(true);
  };

  const openAddSubcategory = (parent: RaidPlanCategory) => {
    setCategoryDialogMode('create');
    setEditingCategoryId(null);
    setCategoryParentId(parent.id);
    setCategoryName('');
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (c: RaidPlanCategory) => {
    setCategoryDialogMode('edit');
    setEditingCategoryId(c.id);
    setCategoryParentId(null);
    setCategoryName(c.name);
    setCategoryDialogOpen(true);
  };

  const submitCategoryDialog = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = categoryName.trim();
    if (!n) {
      showToast('Name is required.', 'error');
      return;
    }
    if (!raidTierId) return;
    setCategorySaving(true);
    try {
      if (categoryDialogMode === 'create') {
        const created = await raidPlanService.createCategory(raidTierId, {
          name: n,
          parentCategoryId: categoryParentId ?? undefined,
        });
        setLayout((prev) =>
          prev
            ? {
                ...prev,
                categories: [...prev.categories, created],
              }
            : { categories: [created], plans: [] }
        );
        setItems((prev) => ({ ...prev, [created.id]: [] }));
        showToast('Category created.');
      } else if (editingCategoryId) {
        const updated = await raidPlanService.updateCategory(raidTierId, editingCategoryId, { name: n });
        setLayout((prev) =>
          prev
            ? {
                ...prev,
                categories: prev.categories.map((c) => (c.id === updated.id ? updated : c)),
              }
            : null
        );
        showToast('Category updated.');
      }
      setCategoryDialogOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save category', 'error');
    } finally {
      setCategorySaving(false);
    }
  };

  const confirmDeletePlan = async () => {
    if (!pendingDeletePlan || !raidTierId) return;
    try {
      await raidPlanService.delete(raidTierId, pendingDeletePlan.id);
      setLayout((prev) =>
        prev
          ? {
              ...prev,
              plans: prev.plans.filter((p) => p.id !== pendingDeletePlan.id),
            }
          : null
      );
      setItems((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          next[k] = next[k].filter((id) => id !== pendingDeletePlan.id);
        }
        return next;
      });
      if (viewerPlanId === pendingDeletePlan.id) setViewerPlanId(null);
      showToast('Deleted.');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not delete', 'error');
    } finally {
      setPendingDeletePlan(null);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!pendingDeleteCategory || !raidTierId) return;
    try {
      await raidPlanService.deleteCategory(raidTierId, pendingDeleteCategory.id);
      await load();
      showToast('Category removed. Raidplans in that group were deleted.');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not delete category', 'error');
    } finally {
      setPendingDeleteCategory(null);
    }
  };

  const handleRefreshPlan = async (id: string) => {
    if (!raidTierId) throw new Error('No raid tier selected');
    const updated = await raidPlanService.refresh(raidTierId, id);
    setLayout((prev) =>
      prev
        ? {
            ...prev,
            plans: prev.plans.map((p) => (p.id === updated.id ? updated : p)),
          }
        : null
    );
    return updated;
  };

  const viewerPlan = viewerPlanId ? plansById[viewerPlanId] ?? null : null;

  return (
    <div className="raid-plans-page">
      <header className="raid-plans-header">
        <h1>Raidplans</h1>
        <p className="raid-plans-intro">
          Click a plan to open the viewer. You can also drag a plan to a category/subcategory to move it there.
        </p>
      </header>

      {tiersLoading && <div className="raid-plans-empty">Loading raid tiers…</div>}

      {!tiersLoading && tierList.length === 0 && (
        <div className="raid-plans-empty">
          No raid tiers yet — create one on the <Link to="/raid-tiers">Raid Tiers</Link> page first.
        </div>
      )}

      {!tiersLoading && tierList.length > 0 && (
        <TextField
          select
          label="Raid tier"
          size="small"
          value={raidTierId ?? ''}
          onChange={(e) => setRaidTierId(e.target.value)}
          sx={{ minWidth: 280, maxWidth: '100%', mb: 2 }}
        >
          {tierList.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.name}
              {t.isCurrent ? ' (current)' : ''}
            </MenuItem>
          ))}
        </TextField>
      )}

      <div className="raid-plans-toolbar-actions">
        <Button
          type="button"
          variant="outlined"
          color="primary"
          size="small"
          startIcon={<FiFolderPlus aria-hidden />}
          onClick={openCreateCategory}
          disabled={!raidTierId || loading}
        >
          New raidplan group
        </Button>
      </div>

      {raidTierId && loading && <div className="raid-plans-empty">Loading plans…</div>}

      {!loading && raidTierId && rootCategories.length === 0 && (
        <div className="raid-plans-empty">Create a category group to start organizing raidplans for this tier.</div>
      )}

      {!loading && raidTierId && rootCategories.length > 0 && layout && (
        <DndContext
          sensors={sensors}
          collisionDetection={raidPlansCollisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={rootCategories.map((r) => `${FIGHT_SORT_PREFIX}${r.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="raid-plans-board">
              {rootCategories.map((c) => (
                <SortableFightColumn
                  key={c.id}
                  root={c}
                  subs={subcategoriesOf(c.id, layout.categories)}
                  items={items}
                  plansById={plansById}
                  onOpen={(id) => setViewerPlanId(id)}
                  onEdit={openEditPlan}
                  onRemove={(p) => setPendingDeletePlan(p)}
                  onEditCategory={openEditCategory}
                  onDeleteCategory={(cat) => setPendingDeleteCategory(cat)}
                  onAddSubcategory={openAddSubcategory}
                  onAddPlan={openCreatePlanForCategory}
                  addPlanDisabled={!raidTierId || loading}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeId && plansById[activeId] ? (
              <div className="raid-plans-sortable-row raid-plans-sortable-row--overlay">
                <span className="raid-plans-sortable-title">{plansById[activeId].title}</span>
              </div>
            ) : activeId?.startsWith(FIGHT_SORT_PREFIX) && layout ? (
              <div className="raid-plans-overlay-pill">
                {layout.categories.find((c) => c.id === activeId.slice(FIGHT_SORT_PREFIX.length))?.name ?? 'Fight'}
              </div>
            ) : activeId && layout?.categories.some((c) => c.id === activeId && c.parentCategoryId) ? (
              <div className="raid-plans-overlay-pill raid-plans-overlay-pill--sub">
                {layout.categories.find((c) => c.id === activeId)?.name ?? 'Phase'}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <RaidPlanViewerDialog
        open={!!viewerPlanId && !!viewerPlan}
        plan={viewerPlan}
        onClose={() => setViewerPlanId(null)}
        onRefreshRequest={handleRefreshPlan}
        onRefreshed={(p) => {
          setLayout((prev) =>
            prev
              ? {
                  ...prev,
                  plans: prev.plans.map((x) => (x.id === p.id ? p : x)),
                }
              : null
          );
        }}
      />

      <Dialog
        open={planDialogOpen}
        onClose={() => !planSaving && setPlanDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        slotProps={{
          backdrop: { sx: { backgroundColor: 'rgba(0, 0, 0, 0.6)' } },
        }}
        PaperProps={{
          sx: {
            overflow: 'visible',
            width: '100%',
            maxWidth: 'min(96vw, 480px)',
          },
        }}
      >
        <form onSubmit={submitPlanDialog}>
          <DialogTitle
            sx={{
              pt: 2.5,
              pb: 2,
              px: 3,
            }}
          >
            {planDialogMode === 'create' ? 'Add raidplan' : 'Edit raidplan'}
          </DialogTitle>
          <DialogContent sx={{ p: 0, overflow: 'visible' }}>
            <Box
              sx={{
                px: 3,
                pt: 4,
                pb: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: 2.5,
              }}
            >
              <TextField
                label="Title"
                value={planTitle}
                onChange={(e) => setPlanTitle(e.target.value)}
                required
                fullWidth
                autoComplete="off"
                disabled={planSaving}
              />
              <TextField
                label="RaidPlan URL"
                value={planUrl}
                onChange={(e) => setPlanUrl(e.target.value)}
                required
                fullWidth
                autoComplete="off"
                disabled={planSaving}
                placeholder="https://raidplan.io/plan/..."
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button type="button" variant="outlined" onClick={() => setPlanDialogOpen(false)} disabled={planSaving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={planSaving}>
              {planSaving ? 'Saving…' : planDialogMode === 'create' ? 'Add' : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={categoryDialogOpen}
        onClose={() => !categorySaving && setCategoryDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{
          backdrop: { sx: { backgroundColor: 'rgba(0, 0, 0, 0.6)' } },
        }}
        PaperProps={{
          sx: {
            overflow: 'visible',
            width: '100%',
            maxWidth: 'min(96vw, 400px)',
          },
        }}
      >
        <form onSubmit={submitCategoryDialog}>
          <DialogTitle
            sx={{
              pt: 2.5,
              pb: 2,
              px: 3,
            }}
          >
            {categoryDialogMode === 'create'
              ? categoryParentId
                ? 'New subcategory'
                : 'New category'
              : 'Edit category'}
          </DialogTitle>
          <DialogContent sx={{ p: 0, overflow: 'visible' }}>
            <Box sx={{ px: 3, pt: 4, pb: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {categoryDialogMode === 'create' && categoryParentId && layout && (
                <p className="raid-plans-dialog-hint">
                  Under fight:{' '}
                  <strong>{layout.categories.find((x) => x.id === categoryParentId)?.name ?? '—'}</strong>
                </p>
              )}
              <TextField
                label="Name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
                fullWidth
                autoComplete="off"
                disabled={categorySaving}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button type="button" variant="outlined" onClick={() => setCategoryDialogOpen(false)} disabled={categorySaving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={categorySaving}>
              {categorySaving ? 'Saving…' : categoryDialogMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {pendingDeletePlan && (
        <ConfirmDialog
          isOpen
          title="Delete raidplan?"
          message={`Remove “${pendingDeletePlan.title}” from the list? This cannot be undone.`}
          confirmText="Delete"
          confirmButtonColor="error"
          onConfirm={confirmDeletePlan}
          onCancel={() => setPendingDeletePlan(null)}
        />
      )}

      {pendingDeleteCategory && (
        <ConfirmDialog
          isOpen
          title={pendingDeleteCategory.parentCategoryId ? 'Delete phase?' : 'Delete category?'}
          message={
            pendingDeleteCategory.parentCategoryId
              ? `Remove “${pendingDeleteCategory.name}”? All raidplans in this phase will be permanently deleted.`
              : `Remove “${pendingDeleteCategory.name}” and its phases? All raidplans in this category and its subcategories will be permanently deleted.`
          }
          confirmText="Delete"
          confirmButtonColor="error"
          onConfirm={confirmDeleteCategory}
          onCancel={() => setPendingDeleteCategory(null)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};
