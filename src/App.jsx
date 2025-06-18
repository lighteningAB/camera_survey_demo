import React, { useState, useRef } from 'react';

// Sample images (update paths if needed)
const imagePaths = [
  './sampleimage/1.png',
  './sampleimage/2.png',
  './sampleimage/3.png',
  './sampleimage/4.png',
];

// For demo, let's assume 3 groups (can be changed)
const TOTAL_GROUPS = 3;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function App() {
  // State for navigation and form
  const [groupIdx, setGroupIdx] = useState(0); // 0-based
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  // State for best/worst selection: [group][card]
  const [best, setBest] = useState(Array(TOTAL_GROUPS).fill().map(() => Array(4).fill(false)));
  const [worst, setWorst] = useState(Array(TOTAL_GROUPS).fill().map(() => Array(4).fill(false)));
  // State for zoom/pan
  const [zoomStates, setZoomStates] = useState(Array(4).fill().map(() => ({ scale: 1, x: 0, y: 0 })));
  const [lockZoom, setLockZoom] = useState(false);
  // State for expand modal
  const [expandedIdx, setExpandedIdx] = useState(null);
  // State for compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState(Array(4).fill(false));
  const [equivalent, setEquivalent] = useState(Array(TOTAL_GROUPS).fill(false));
  // Move together for compare modal
  const [compareLockZoom, setCompareLockZoom] = useState(false);
  // Drag state (global for all PhotoCards)
  const [draggingCardIdx, setDraggingCardIdx] = useState(null); // index of card being dragged, or null
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Handlers for best/worst
  const handleBest = (idx) => {
    setBest((prev) => {
      const next = prev.map((arr, g) => g === groupIdx ? arr.map((v, i) => i === idx) : arr);
      return next;
    });
  };
  const handleWorst = (idx) => {
    setWorst((prev) => {
      const next = prev.map((arr, g) => g === groupIdx ? arr.map((v, i) => i === idx) : arr);
      return next;
    });
  };

  // Handler for compare selection
  const handleCompareSelect = (idx) => {
    setSelectedForCompare(prev => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  // Handler for equivalent selection
  const handleEquivalent = () => {
    setEquivalent(prev => {
      const next = [...prev];
      next[groupIdx] = !next[groupIdx];
      return next;
    });
  };

  // Handlers for zoom/pan
  const handleZoom = (idx, delta, origin, useCompareLock) => {
    setZoomStates((prev) => {
      const newScale = clamp(prev[idx].scale * (delta > 0 ? 1.1 : 0.9), 1, 5);
      let newStates = [...prev];
      if (lockZoom || useCompareLock) {
        newStates = newStates.map(() => ({ ...prev[idx], scale: newScale }));
      } else {
        newStates[idx] = { ...prev[idx], scale: newScale };
      }
      return newStates;
    });
  };
  const handlePan = (idx, dx, dy, useCompareLock) => {
    setZoomStates((prev) => {
      let newStates = [...prev];
      if (lockZoom || useCompareLock) {
        newStates = newStates.map((z) => ({ ...z, x: z.x + dx, y: z.y + dy }));
      } else {
        newStates[idx] = { ...prev[idx], x: prev[idx].x + dx, y: prev[idx].y + dy };
      }
      return newStates;
    });
  };
  const resetZoom = (idx) => {
    setZoomStates((prev) => {
      let newStates = [...prev];
      if (lockZoom) {
        newStates = newStates.map(() => ({ scale: 1, x: 0, y: 0 }));
      } else {
        newStates[idx] = { scale: 1, x: 0, y: 0 };
      }
      return newStates;
    });
  };
  // Reset all zoom/pan
  const resetAllZoom = () => {
    setZoomStates(Array(4).fill().map(() => ({ scale: 1, x: 0, y: 0 })));
  };

  // Navigation
  const nextGroup = () => setGroupIdx((g) => clamp(g + 1, 0, TOTAL_GROUPS - 1));
  const prevGroup = () => setGroupIdx((g) => clamp(g - 1, 0, TOTAL_GROUPS - 1));

  // Drag handlers
  const startDrag = (idx, offset) => {
    setDraggingCardIdx(idx);
    setDragOffset(offset);
    setIsDragging(true);
  };
  const stopDrag = () => {
    setDraggingCardIdx(null);
    setIsDragging(false);
  };

  // Utility to get image and container sizes
  function getImageAndContainerSizes(imgRef, containerWidth, containerHeight, scale) {
    if (!imgRef.current) return { imgW: 0, imgH: 0 };
    const naturalW = imgRef.current.naturalWidth;
    const naturalH = imgRef.current.naturalHeight;
    // Fit image to container (contain)
    const ratio = Math.min(containerWidth / naturalW, containerHeight / naturalH);
    const imgW = naturalW * ratio * scale;
    const imgH = naturalH * ratio * scale;
    return { imgW, imgH };
  }

  // In App, add a function to reset zoom/pan for a given card
  const openExpand = (idx) => {
    // Reset zoom and pan for the expanded image
    setZoomStates((prev) => {
      let newStates = [...prev];
      newStates[idx] = { scale: 1, x: 0, y: 0 };
      return newStates;
    });
    setExpandedIdx(idx);
  };

  // PhotoCard component
  function PhotoCard({ idx, expanded, onExpand, draggingCardIdx, dragOffset, isDragging, startDrag, stopDrag, isModal, useCompareLock }) {
    const imgRef = useRef();
    const [isMouseOver, setIsMouseOver] = useState(false);
    const containerWidth = expanded ? 350 : 200;
    const containerHeight = expanded ? 500 : 260;

    // Mouse wheel for zoom
    const onWheel = (e) => {
      if (!isModal) return;
      e.preventDefault();
      handleZoom(idx, e.deltaY, { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }, useCompareLock);
    };
    // Click and hold to drag
    const onMouseDown = (e) => {
      if (!isModal) return;
      if (e.button === 0 && zoomStates[idx].scale > 1) {
        const { scale, x, y } = zoomStates[idx];
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left - containerWidth / 2 - x * scale;
        const clickY = e.clientY - rect.top - containerHeight / 2 - y * scale;
        startDrag(idx, { x: clickX, y: clickY });
      }
    };
    const onMouseUp = (e) => {
      if (!isModal) return;
      if (isDragging && draggingCardIdx === idx) {
        stopDrag();
      }
    };
    const onMouseLeave = (e) => {
      if (!isModal) return;
      if (isDragging && draggingCardIdx === idx) {
        stopDrag();
      }
      setIsMouseOver(false);
    };
    const onMouseEnter = () => {
      if (!isModal) return;
      setIsMouseOver(true);
    };

    // Move drag handlers to window for global drag
    React.useEffect(() => {
      if (!isModal || !(isDragging && draggingCardIdx === idx)) return;
      const handleMove = (e) => {
        const { scale } = zoomStates[idx];
        const container = imgRef.current?.parentElement;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - containerWidth / 2;
        const mouseY = e.clientY - rect.top - containerHeight / 2;
        let newX = (mouseX - dragOffset.x) / scale;
        let newY = (mouseY - dragOffset.y) / scale;
        const { imgW, imgH } = getImageAndContainerSizes(imgRef, containerWidth, containerHeight, scale);
        const maxX = Math.max(0, (imgW - containerWidth) / 2 / scale);
        const maxY = Math.max(0, (imgH - containerHeight) / 2 / scale);
        newX = Math.max(-maxX, Math.min(maxX, newX));
        newY = Math.max(-maxY, Math.min(maxY, newY));
        setZoomStates((prev) => {
          let newStates = [...prev];
          if (lockZoom || useCompareLock) {
            newStates = newStates.map((z) => ({ ...z, x: newX, y: newY }));
          } else {
            newStates[idx] = { ...prev[idx], x: newX, y: newY };
          }
          return newStates;
        });
      };
      const handleUp = () => {
        if (isDragging && draggingCardIdx === idx) {
          stopDrag();
        }
      };
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };
    }, [isModal, isDragging, draggingCardIdx, dragOffset, zoomStates, idx, lockZoom, useCompareLock, containerWidth, containerHeight, stopDrag]);

    // When scale is reset to 1, also reset pan to center and stop dragging
    React.useEffect(() => {
      if (!isModal) return;
      if (zoomStates[idx].scale === 1 && (zoomStates[idx].x !== 0 || zoomStates[idx].y !== 0)) {
        setZoomStates((prev) => {
          let newStates = [...prev];
          newStates[idx] = { ...prev[idx], x: 0, y: 0 };
          return newStates;
        });
      }
      if (zoomStates[idx].scale === 1 && (isDragging && draggingCardIdx === idx)) {
        stopDrag();
      }
    }, [isModal, zoomStates[idx].scale, idx, isDragging, draggingCardIdx, stopDrag]);

    // Style for zoom/pan
    const { scale, x, y } = zoomStates[idx];
    let cursor = 'default';
    if (isModal && scale > 1) {
      if (isDragging && draggingCardIdx === idx) cursor = 'grabbing';
      else if (isMouseOver) cursor = 'grab';
    }
    const imgStyle = {
      transform: `translate(${x}px, ${y}px) scale(${scale})`,
      transition: (isDragging && draggingCardIdx === idx) ? 'none' : 'transform 0.2s',
      cursor,
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      userSelect: 'none',
      pointerEvents: expanded ? 'auto' : 'auto',
    };

    return (
      <div
        className="photo-card"
        style={{ 
          position: 'relative', 
          background: '#fff', 
          border: '2px solid #222', 
          minHeight: expanded ? 500 : 260, 
          minWidth: expanded ? 350 : 200, 
          boxShadow: '2px 2px 0 #222', 
          overflow: 'hidden',
        }}
      >
        {/* Expand button */}
        {!isModal && (
          <button
            onClick={() => onExpand(idx)}
            style={{ 
              position: 'absolute', 
              top: 8, 
              left: 8, 
              zIndex: 2, 
              background: '#fff', 
              border: '1px solid #222', 
              borderRadius: 8, 
              padding: 2, 
              cursor: 'pointer', 
              fontWeight: 'bold' 
            }}
            title="Expand"
          >
            &#x2922;
          </button>
        )}
        {/* Compare checkbox */}
        {!isModal && (
          <label
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 2,
              background: '#fff',
              border: '1px solid #222',
              borderRadius: 8,
              padding: '2px 8px',
              cursor: 'pointer',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            Add to compare
            <input
              type="checkbox"
              checked={selectedForCompare[idx]}
              onChange={() => handleCompareSelect(idx)}
              style={{ margin: 0 }}
            />
          </label>
        )}
        {/* Reset zoom button (only in modal) */}
        {isModal && scale > 1 && (
          <button
            onClick={() => resetZoom(idx)}
            style={{ 
              position: 'absolute', 
              top: 8, 
              left: 8, 
              zIndex: 2, 
              background: '#fff', 
              border: '1px solid #222', 
              borderRadius: 8, 
              padding: 2, 
              cursor: 'pointer', 
              fontWeight: 'bold' 
            }}
            title="Reset zoom"
          >
            &#x21bb;
          </button>
        )}
        {/* Image preview */}
        <div
          style={{ 
            width: '100%', 
            height: expanded ? 500 : 260, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: '#eee', 
            overflow: 'hidden' 
          }}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onMouseEnter={onMouseEnter}
        >
          <img
            ref={imgRef}
            src={imagePaths[idx]}
            alt={`photo ${idx + 1}`}
            draggable={false}
            style={imgStyle}
          />
        </div>
      </div>
    );
  }

  // Modal for expanded view
  const Modal = ({ children, onClose }) => (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', border: '2px solid #222', boxShadow: '4px 4px 0 #222', padding: 24, position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: 8, right: 8, background: '#fff', border: '1px solid #222', borderRadius: 8, padding: 2, cursor: 'pointer', fontWeight: 'bold' }}>&#x2715;</button>
        {children}
      </div>
    </div>
  );

  // Main render
  return (
    <div style={{ fontFamily: '"Comic Sans MS", "Comic Sans", cursive', background: '#fafafa', minHeight: '100vh', padding: 0, margin: 0 }}>
      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <h1 style={{ fontWeight: 700, fontSize: 36, marginBottom: 8 }}>Nothing Photo Blind Test</h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
          <input
            type="text"
            placeholder="name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ fontSize: 20, borderRadius: 12, border: '2px solid #222', padding: '4px 16px', width: 160, textAlign: 'center' }}
          />
          <input
            type="text"
            placeholder="country"
            value={country}
            onChange={e => setCountry(e.target.value)}
            style={{ fontSize: 20, borderRadius: 12, border: '2px solid #222', padding: '4px 16px', width: 160, textAlign: 'center' }}
          />
        </div>
        <div style={{ fontSize: 18, marginBottom: 24 }}>
          select the best and worst in each group, please compare and look closely
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', background: 'none', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 500 }}>group: front_a || {groupIdx + 1}/{TOTAL_GROUPS}</div>
          <button
            onClick={() => setCompareMode(!compareMode)}
            style={{
              fontSize: 16,
              borderRadius: 8,
              border: '2px solid #222',
              background: '#fff',
              padding: '4px 16px',
              cursor: 'pointer'
            }}
          >
            {compareMode ? 'Exit Compare' : 'Compare Selected'}
          </button>
        </div>
        {/* Photo cards */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <PhotoCard
                idx={idx}
                expanded={expandedIdx === idx}
                onExpand={openExpand}
                draggingCardIdx={draggingCardIdx}
                dragOffset={dragOffset}
                isDragging={isDragging}
                startDrag={startDrag}
                stopDrag={stopDrag}
                isModal={false}
              />
              {/* Best/Worst checkboxes */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 8 }}>
                <label style={{ fontSize: 16, marginBottom: 2 }}>
                  {idx === 0 && 'select the best'}
                  <input
                    type="checkbox"
                    checked={best[groupIdx][idx]}
                    onChange={() => handleBest(idx)}
                    style={{ marginRight: 4 }}
                  />
                </label>
                <label style={{ fontSize: 16 }}>
                  {idx === 0 && 'select the worst'}
                  <input
                    type="checkbox"
                    checked={worst[groupIdx][idx]}
                    onChange={() => handleWorst(idx)}
                    style={{ marginRight: 4 }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
        {/* Equivalent checkbox */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 8, marginLeft: 0 }}>
          <label style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 4, marginLeft: 24 }}>
            The remaining are equivalent
            <input
              type="checkbox"
              checked={equivalent[groupIdx]}
              onChange={handleEquivalent}
              style={{ marginLeft: 4 }}
            />
          </label>
        </div>
        {/* n/N indicator and navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 16 }}>
          <button onClick={prevGroup} disabled={groupIdx === 0} style={{ fontSize: 20, borderRadius: 8, border: '2px solid #222', background: '#fff', padding: '4px 16px', cursor: groupIdx === 0 ? 'not-allowed' : 'pointer' }}>&lt;</button>
          <div style={{ fontSize: 20, fontWeight: 500, border: '2px solid #222', borderRadius: 12, padding: '2px 24px', background: '#fff' }}>{groupIdx + 1}/{TOTAL_GROUPS}</div>
          <button onClick={nextGroup} disabled={groupIdx === TOTAL_GROUPS - 1} style={{ fontSize: 20, borderRadius: 8, border: '2px solid #222', background: '#fff', padding: '4px 16px', cursor: groupIdx === TOTAL_GROUPS - 1 ? 'not-allowed' : 'pointer' }}>&gt;</button>
        </div>
      </div>
      {/* Expanded modal */}
      {expandedIdx !== null && (
        <Modal onClose={() => { setExpandedIdx(null); resetAllZoom(); }}>
          <PhotoCard
            idx={expandedIdx}
            expanded={true}
            onExpand={() => { setExpandedIdx(null); resetAllZoom(); }}
            draggingCardIdx={draggingCardIdx}
            dragOffset={dragOffset}
            isDragging={isDragging}
            startDrag={startDrag}
            stopDrag={stopDrag}
            isModal={true}
            useCompareLock={false}
          />
        </Modal>
      )}
      {/* Compare modal */}
      {compareMode && (
        <Modal onClose={() => { setCompareMode(false); resetAllZoom(); }}>
          <div style={{ position: 'relative' }}>
            <label style={{ position: 'absolute', top: 0, left: 0, zIndex: 2, background: '#fff', border: '1px solid #222', borderRadius: 8, padding: '2px 8px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
              Move together
              <input type="checkbox" checked={compareLockZoom} onChange={e => setCompareLockZoom(e.target.checked)} />
            </label>
            <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
              {selectedForCompare.map((selected, idx) => (
                selected && (
                  <PhotoCard
                    key={idx}
                    idx={idx}
                    expanded={true}
                    onExpand={() => {}}
                    draggingCardIdx={draggingCardIdx}
                    dragOffset={dragOffset}
                    isDragging={isDragging}
                    startDrag={startDrag}
                    stopDrag={stopDrag}
                    isModal={true}
                    useCompareLock={compareLockZoom}
                  />
                )
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default App; 