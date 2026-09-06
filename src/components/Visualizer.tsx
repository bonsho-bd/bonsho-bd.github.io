import React, { useRef, useState, useEffect } from 'react';
import { FamilyTree, Person } from '../types/family';
import { ZoomIn, ZoomOut, RotateCcw, User, Heart, Plus, MapPin, Calendar } from 'lucide-react';

interface VisualizerProps {
  tree: FamilyTree;
  searchQuery: string;
  onSelectPerson: (person: Person) => void;
  onAddChild: (parent: Person) => void;
  onAddSpouse: (person: Person) => void;
  onAddPerson: (x?: number, y?: number) => void;
}

interface NodeLayout {
  id: string;
  person: Person;
  x: number;
  y: number;
  width: number;
  height: number;
  spouses: Person[];
  marriageY: number;
  childrenIds: string[];
}

interface LinkPath {
  id: string;
  d: string;
}

const CARD_WIDTH = 190;
const CARD_HEIGHT = 105;
const HORIZONTAL_GAP = 40;
const VERTICAL_GAP = 140;

export const Visualizer: React.FC<VisualizerProps> = ({
  tree,
  searchQuery,
  onSelectPerson,
  onAddChild,
  onAddSpouse,
  onAddPerson,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [clickStartPos, setClickStartPos] = useState<{ x: number; y: number } | null>(null);
    const [floatingAddBtnPos, setFloatingAddBtnPos] = useState<{ x: number; y: number; logicalX: number; logicalY: number } | null>(null);
  const [lastPinchDist, setLastPinchDist] = useState<number | null>(null);

  // Compute Tree Layout
  const { nodes, links, bounds } = React.useMemo(() => {
    const layoutMap = new Map<string, NodeLayout>();
    const linkList: LinkPath[] = [];
    const visited = new Set<string>();

    if (tree.rootIds.length === 0 && Object.keys(tree.people).length > 0) {
      tree.rootIds = [Object.keys(tree.people)[0]];
    }

    // Helper to calculate subtree width
    function calculateSubtreeWidth(personId: string): number {
      const p = tree.people[personId];
      if (!p) return CARD_WIDTH;

      const spouseCount = p.marriages.length;
      const unitWidth = CARD_WIDTH + (spouseCount * (CARD_WIDTH + 20));

      const allChildren: string[] = [];
      for (const m of p.marriages) {
        allChildren.push(...m.children);
      }
      allChildren.push(...p.unassociatedChildren);

      if (allChildren.length === 0) {
        return unitWidth;
      }

      let childrenTotalWidth = 0;
      for (const cId of allChildren) {
        childrenTotalWidth += calculateSubtreeWidth(cId) + HORIZONTAL_GAP;
      }
      childrenTotalWidth -= HORIZONTAL_GAP;

      return Math.max(unitWidth, childrenTotalWidth);
    }

    // Recursive layout placement
    let currentXOffset = 0;

    function layoutPerson(personId: string, startX: number, startY: number, forceX?: number): number {
      if (visited.has(personId)) return startX;
      visited.add(personId);

      const person = tree.people[personId];
      if (!person) return startX;

      const spouses = person.marriages
        .map(m => tree.people[m.spouseId])
        .filter(Boolean) as Person[];

      // Mark spouses as visited so they don't get duplicated as separate roots
      for (const spouse of spouses) {
        visited.add(spouse.id);
      }

      const allChildren: string[] = [];
      for (const m of person.marriages) {
        allChildren.push(...m.children);
      }
      allChildren.push(...person.unassociatedChildren);

      const subtreeWidth = calculateSubtreeWidth(personId);
      const coupleWidth = CARD_WIDTH + (spouses.length * (CARD_WIDTH + 20));
      
      let personX = startX + (subtreeWidth - coupleWidth) / 2;
      let usedStartX = startX;
      if (forceX !== undefined) {
        personX = forceX;
        usedStartX = forceX - (subtreeWidth - coupleWidth) / 2;
      }

      const y = startY;

      layoutMap.set(personId, {
        id: personId,
        person,
        x: personX,
        y,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        spouses,
        marriageY: y + CARD_HEIGHT / 2,
        childrenIds: allChildren,
      });

      // Layout children recursively
      let childX = usedStartX;
      for (const childId of allChildren) {
        const childWidth = calculateSubtreeWidth(childId);
        layoutPerson(childId, childX, startY + VERTICAL_GAP);

        // Create link from parent couple to child
        const childLayout = layoutMap.get(childId);
        if (childLayout) {
          const parentSourceX = personX + coupleWidth / 2;
          const parentSourceY = y + CARD_HEIGHT;
          const childTargetX = childLayout.x + CARD_WIDTH / 2;
          const childTargetY = childLayout.y;

          const midY = (parentSourceY + childTargetY) / 2;
          const pathD = `M ${parentSourceX} ${parentSourceY} V ${midY} H ${childTargetX} V ${childTargetY}`;

          linkList.push({
            id: `link_${personId}_${childId}`,
            d: pathD,
          });
        }

        childX += childWidth + HORIZONTAL_GAP;
      }

      return usedStartX + subtreeWidth + HORIZONTAL_GAP;
    }

    for (const rootId of tree.rootIds) {
      const p = tree.people[rootId];
      if (p && p.customProperties['_x'] && p.customProperties['_y']) {
        const cx = parseFloat(p.customProperties['_x']);
        const cy = parseFloat(p.customProperties['_y']);
        layoutPerson(rootId, currentXOffset, cy, cx);
      } else {
        currentXOffset = layoutPerson(rootId, currentXOffset, 0);
      }
    }

    // Include any unlinked components
    for (const pId of Object.keys(tree.people)) {
      if (!visited.has(pId)) {
        const p = tree.people[pId];
        if (p && p.customProperties['_x'] && p.customProperties['_y']) {
          const cx = parseFloat(p.customProperties['_x']);
          const cy = parseFloat(p.customProperties['_y']);
          layoutPerson(pId, currentXOffset, cy, cx);
        } else {
          currentXOffset = layoutPerson(pId, currentXOffset, 0);
        }
      }
    }

    const nodeArray = Array.from(layoutMap.values());
    let minX = 0, maxX = 1000, minY = 0, maxY = 800;
    if (nodeArray.length > 0) {
      minX = Math.min(...nodeArray.map(n => n.x));
      maxX = Math.max(...nodeArray.map(n => n.x + CARD_WIDTH + (n.spouses.length * (CARD_WIDTH + 20))));
      minY = Math.min(...nodeArray.map(n => n.y));
      maxY = Math.max(...nodeArray.map(n => n.y + CARD_HEIGHT));
    }

    return {
      nodes: nodeArray,
      links: linkList,
      bounds: { minX, maxX, minY, maxY },
    };
  }, [tree]);

  // Accurately center the tree on the canvas
  const centerTree = React.useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    if (nodes.length === 0) {
      setPan({ x: rect.width / 2, y: rect.height / 2 });
      setZoom(1);
      return;
    }

    const contentWidth = Math.max(bounds.maxX - bounds.minX, CARD_WIDTH);
    const contentHeight = Math.max(bounds.maxY - bounds.minY, CARD_HEIGHT);
    const centerX = (bounds.minX + bounds.maxX) / 2;

    // Leave comfortable margins around the tree
    const availableWidth = rect.width - 120;
    const availableHeight = rect.height - 140;

    const fitZoomX = availableWidth > 0 ? availableWidth / contentWidth : 1;
    const fitZoomY = availableHeight > 0 && contentHeight > 0 ? availableHeight / contentHeight : 1;
    const fitZoom = Math.min(fitZoomX, fitZoomY, 1);
    const newZoom = Math.max(Math.min(fitZoom, 1), 0.45);

    const newPanX = rect.width / 2 - centerX * newZoom;
    const newPanY = Math.max(60, Math.min(100, (rect.height - contentHeight * newZoom) / 3));

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [nodes.length, bounds]);

  // Auto-center on initial mount and when tree structure changes
  // Keep track of initial load
  const isInitialLoad = useRef(true);
  useEffect(() => {
    if (isInitialLoad.current && nodes.length > 0) {
      const frame = requestAnimationFrame(() => {
        centerTree();
        isInitialLoad.current = false;
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [nodes.length, centerTree]);


  // Pan & Zoom & Click handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // only left click
    const target = e.target as HTMLElement;
    if (
      target.closest('.floating-add-btn') ||
      target.closest('.zoom-controls') ||
      target.closest('button')
    ) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    setClickStartPos({ x: e.clientX, y: e.clientY });
    setFloatingAddBtnPos(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsDragging(false);

    const target = e.target as HTMLElement;
    if (
      target.closest('.floating-add-btn') ||
      target.closest('.zoom-controls') ||
      target.closest('button')
    ) {
      return;
    }

    // If mouse didn't drag/move, it is a click on canvas background!
    if (clickStartPos) {
      const distance = Math.hypot(e.clientX - clickStartPos.x, e.clientY - clickStartPos.y);
      if (distance < 5) {
        const isBackground =
          target === containerRef.current ||
          target.classList.contains('canvas-bg');

        if (isBackground) {
          if (nodes.length === 0) {
            onAddPerson(floatingAddBtnPos?.logicalX, floatingAddBtnPos?.logicalY);
          } else {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
              setFloatingAddBtnPos({ 
                x: e.clientX - rect.left, 
                y: e.clientY - rect.top,
                logicalX: ((e.clientX - rect.left) - pan.x) / zoom,
                logicalY: ((e.clientY - rect.top) - pan.y) / zoom
              });
            }
          }
        }
      }
    }
    setClickStartPos(null);
  };

  // Touch Handlers for Pinch to Zoom and Panning
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('.floating-add-btn') ||
      target.closest('.zoom-controls') ||
      target.closest('button')
    ) {
      return;
    }
    
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
      setClickStartPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setFloatingAddBtnPos(null);
    } else if (e.touches.length === 2) {
      setIsDragging(false); // Stop panning when pinching
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setLastPinchDist(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && lastPinchDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const zoomDelta = dist / lastPinchDist;
      
      setZoom(prevZoom => {
        const newZoom = Math.min(Math.max(prevZoom * zoomDelta, 0.2), 2.5);
        if (newZoom !== prevZoom) {
          setPan(prevPan => {
            if (!containerRef.current) return prevPan;
            const pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const pinchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            
            const rect = containerRef.current.getBoundingClientRect();
            const pointerX = pinchCenterX - rect.left;
            const pointerY = pinchCenterY - rect.top;
            
            const logicalX = (pointerX - prevPan.x) / prevZoom;
            const logicalY = (pointerY - prevPan.y) / prevZoom;
            
            return {
              x: pointerX - logicalX * newZoom,
              y: pointerY - logicalY * newZoom,
            };
          });
        }
        return newZoom;
      });
      
      setLastPinchDist(dist);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setLastPinchDist(null);
    }
    
    if (e.touches.length === 0) {
      setIsDragging(false);
      
      // Simulate tap on background (like handleMouseUp)
      if (clickStartPos && e.changedTouches.length === 1) {
        const distance = Math.hypot(e.changedTouches[0].clientX - clickStartPos.x, e.changedTouches[0].clientY - clickStartPos.y);
        if (distance < 10) { // Slightly larger tolerance for touch
          const target = e.target as HTMLElement;
          const isBackground =
            target === containerRef.current ||
            target.classList.contains('canvas-bg');

          if (isBackground) {
            if (nodes.length === 0) {
              onAddPerson(floatingAddBtnPos?.logicalX, floatingAddBtnPos?.logicalY);
            } else {
              const rect = containerRef.current?.getBoundingClientRect();
              if (rect) {
                setFloatingAddBtnPos({ 
                  x: e.changedTouches[0].clientX - rect.left, 
                  y: e.changedTouches[0].clientY - rect.top,
                  logicalX: ((e.changedTouches[0].clientX - rect.left) - pan.x) / zoom,
                  logicalY: ((e.changedTouches[0].clientY - rect.top) - pan.y) / zoom
                });
              }
            }
          }
        }
      }
    } else if (e.touches.length === 1) {
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
      setIsDragging(true);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    
    setZoom(prevZoom => {
      const newZoom = Math.min(Math.max(prevZoom * zoomFactor, 0.2), 2.5);
      if (newZoom !== prevZoom) {
        setPan(prevPan => {
          if (!containerRef.current) return prevPan;
          const rect = containerRef.current.getBoundingClientRect();
          const pointerX = e.clientX - rect.left;
          const pointerY = e.clientY - rect.top;
          
          const logicalX = (pointerX - prevPan.x) / prevZoom;
          const logicalY = (pointerY - prevPan.y) / prevZoom;
          
          return {
            x: pointerX - logicalX * newZoom,
            y: pointerY - logicalY * newZoom,
          };
        });
      }
      return newZoom;
    });
  };

  const handleZoomWithCenter = (zoomFactor: number) => {
    setZoom(prevZoom => {
      const newZoom = Math.min(Math.max(prevZoom * zoomFactor, 0.2), 2.5);
      if (newZoom !== prevZoom) {
        setPan(prevPan => {
          if (!containerRef.current) return prevPan;
          const rect = containerRef.current.getBoundingClientRect();
          const pointerX = rect.width / 2;
          const pointerY = rect.height / 2;
          
          const logicalX = (pointerX - prevPan.x) / prevZoom;
          const logicalY = (pointerY - prevPan.y) / prevZoom;
          
          return {
            x: pointerX - logicalX * newZoom,
            y: pointerY - logicalY * newZoom,
          };
        });
      }
      return newZoom;
    });
  };

  const handleZoomIn = () => handleZoomWithCenter(1.2);
  const handleZoomOut = () => handleZoomWithCenter(0.8);
  const handleResetZoom = () => {
    centerTree();
    window.dispatchEvent(new CustomEvent('bonsho-reset-layout'));
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="relative w-full h-full overflow-hidden bg-slate-100 select-none cursor-grab active:cursor-grabbing canvas-bg touch-none"
    >
      {/* Floating Add Person Button on Canvas (Click triggered) */}
      {floatingAddBtnPos && (
        <div
          className="absolute z-30 animate-in fade-in zoom-in-95 duration-200 floating-add-btn"
          style={{ left: floatingAddBtnPos.x, top: floatingAddBtnPos.y }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFloatingAddBtnPos(null);
              onAddPerson(floatingAddBtnPos?.logicalX, floatingAddBtnPos?.logicalY);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xl transition hover:scale-105 active:scale-95 -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none"
            title="নতুন ব্যক্তি যোগ করুন"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন ব্যক্তি যোগ করুন</span>
          </button>
        </div>
      )}

      {/* Background Dot Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 canvas-bg"
        style={{
          backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* SVG Canvas for Connectors */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        style={{ overflow: 'visible' }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {links.map(link => (
            <path
              key={link.id}
              d={link.d}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          ))}
        </g>
      </svg>

      {/* Nodes Container */}
      <div
        className="absolute origin-top-left z-20"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {nodes.map(node => {
          const person = node.person;
          const isMatch = searchQuery.trim() && person.name.toLowerCase().includes(searchQuery.trim().toLowerCase());

          return (
            <div
              key={node.id}
              className="absolute flex items-center"
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
              }}
            >
              {/* Primary Person Card */}
              <PersonCard
                person={person}
                isMatch={Boolean(isMatch)}
                onSelectPerson={() => onSelectPerson(person)}
                onAddChild={() => onAddChild(person)}
                onAddSpouse={() => onAddSpouse(person)}
              />

              {/* Spouses Rendered Side-by-Side */}
              {node.spouses.map(spouse => {
                const isSpouseMatch = searchQuery.trim() && spouse.name.toLowerCase().includes(searchQuery.trim().toLowerCase());

                return (
                  <React.Fragment key={spouse.id}>
                    {/* Marriage Connector Line & Icon */}
                    <div className="flex items-center px-1">
                      <div className="w-3 h-0.5 bg-rose-300"></div>
                      <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-500 border border-rose-300 flex items-center justify-center shadow-xs">
                        <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                      </div>
                      <div className="w-3 h-0.5 bg-rose-300"></div>
                    </div>

                    {/* Spouse Card */}
                    <PersonCard
                      person={spouse}
                      isMatch={Boolean(isSpouseMatch)}
                      onSelectPerson={() => onSelectPerson(spouse)}
                      onAddChild={() => onAddChild(spouse)}
                      onAddSpouse={() => onAddSpouse(spouse)}
                    />
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Empty State Banner when Tree has no people */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-6 shadow-xl text-center max-w-sm pointer-events-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">ফ্যামিলি ট্রি খালি</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                এই শিটটিতে এখনো কোনো তথ্য নেই। আপনি প্রথম ব্যক্তি যোগ করে বংশতালিকা তৈরি শুরু করতে পারেন।
              </p>
            </div>
            <button
              onClick={() => onAddPerson()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ প্রথম ব্যক্তি যোগ করুন</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Zoom & Navigation Controls */}
      <div
        className="zoom-controls absolute right-4 bottom-4 sm:right-6 sm:bottom-6 z-30 flex flex-col gap-2 bg-white/95 backdrop-blur border border-slate-200 shadow-lg rounded-2xl p-1.5 text-slate-700 select-none"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleZoomIn();
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            handleZoomIn();
          }}
          title="বড় করুন (Zoom In)"
          className="p-3 sm:p-2 hover:bg-slate-100 active:scale-90 rounded-xl transition flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ZoomIn className="w-4 h-4 pointer-events-none" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleZoomOut();
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            handleZoomOut();
          }}
          title="ছোট করুন (Zoom Out)"
          className="p-3 sm:p-2 hover:bg-slate-100 active:scale-90 rounded-xl transition flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ZoomOut className="w-4 h-4 pointer-events-none" />
        </button>
        <div className="h-px bg-slate-200 my-0.5"></div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleResetZoom();
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            handleResetZoom();
          }}
          title="পুনরায় সাজান"
          className="p-3 sm:p-2 hover:bg-slate-100 active:scale-90 rounded-xl transition flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 pointer-events-none" />
        </button>
      </div>

    </div>
  );
};

interface PersonCardProps {
  person: Person;
  isMatch: boolean;
  onSelectPerson: () => void;
  onAddChild: () => void;
  onAddSpouse: () => void;
}

const PersonCard: React.FC<PersonCardProps> = ({
  person,
  isMatch,
  onSelectPerson,
  onAddChild,
  onAddSpouse,
}) => {
  const isFemale = person.gender === 'female';
  const isMale = person.gender === 'male';

  return (
    <div
      className={`group relative w-[190px] h-[105px] bg-white rounded-2xl shadow-sm border transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer ${
        isMatch ? 'ring-4 ring-amber-400 border-amber-500 shadow-amber-200' :
        isFemale ? 'border-rose-200 hover:border-rose-400' :
        isMale ? 'border-emerald-200 hover:border-emerald-400' :
        'border-slate-200 hover:border-slate-400'
      }`}
      onClick={onSelectPerson}
    >
      {/* Top Banner with Badges */}
      <div className={`h-2 rounded-t-2xl ${
        isFemale ? 'bg-gradient-to-r from-rose-400 to-pink-500' :
        isMale ? 'bg-gradient-to-r from-emerald-500 to-teal-600' :
        'bg-gradient-to-r from-slate-400 to-gray-500'
      }`} />

      <div className="p-2.5 flex items-start gap-2.5 h-[calc(100%-8px)]">
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-2xs ${
          isFemale ? 'bg-rose-500' :
          isMale ? 'bg-emerald-600' :
          'bg-slate-600'
        }`}>
          {person.photo ? (
            <img src={person.photo} alt={person.name} className="w-full h-full object-cover rounded-xl" />
          ) : (
            <User className="w-5 h-5" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between gap-1">
              <h4 className="font-bold text-xs text-slate-800 truncate" title={person.name}>
                {person.name}
              </h4>
              {person.isDeceased && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 shrink-0">
                  প্রয়াত
                </span>
              )}
            </div>

            {/* Dates */}
            {(person.birth || person.death) && (
              <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                <Calendar className="w-3 h-3 text-slate-300 shrink-0" />
                <span className="truncate">
                  {(() => {
                    if (person.birth && person.death) return `${person.birth} - ${person.death}`;
                    if (person.birth && !person.death) {
                      if (person.isDeceased) return `${person.birth} - $প্রয়াত`;
                      return `জন্ম: ${person.birth}`;
                    }
                    if (!person.birth && person.death) return `? - ${person.death}`;
                    return '';
                  })()}
                </span>
              </div>
            )}
          </div>

          {/* Village or Profession */}
          {person.village ? (
            <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate mt-auto">
              <MapPin className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
              <span className="truncate">{person.village}</span>
            </div>
          ) : person.notes ? (
            <div className="text-[10px] text-slate-500 truncate mt-auto">
              {person.notes.split('\n')[0]}
            </div>
          ) : null}
        </div>
      </div>

      {/* Quick Action Overlay on Hover */}
      <div
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1 bg-white border border-slate-200 shadow-md rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 z-30"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onAddChild}
          className="hover:text-emerald-700 hover:bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 transition"
          title="সন্তান যোগ করুন"
        >
          <Plus className="w-2.5 h-2.5" />
          <span>সন্তান</span>
        </button>
        <div className="w-px h-2.5 bg-slate-200" />
        <button
          onClick={onAddSpouse}
          className="hover:text-rose-700 hover:bg-rose-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 transition"
          title="স্বামী বা স্ত্রী যোগ করুন"
        >
          <Heart className="w-2.5 h-2.5" />
          <span>সঙ্গী</span>
        </button>
      </div>

    </div>
  );
};

