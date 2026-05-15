import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';

const PhotoEditorModal = ({ image, onClose, onSave }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartPos({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    setPosition({ x: e.touches[0].clientX - startPos.x, y: e.touches[0].clientY - startPos.y });
  };

  const handleCrop = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;

    if (!img || !img.complete) return;

    canvas.width = 400;
    canvas.height = 400;

    // Preencher fundo com branco (evita fundo preto em PNGs transparentes)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 400, 400);

    const displaySize = 250;
    
    // Usamos Math.floor para evitar números decimais que podem bugar o drawImage
    const sourceWidth = Math.floor(displaySize / scale);
    const sourceHeight = Math.floor(displaySize / scale);
    const sourceX = Math.floor((-position.x) / scale);
    const sourceY = Math.floor((-position.y) / scale);

    try {
      ctx.drawImage(
        img, 
        sourceX, sourceY, sourceWidth, sourceHeight, 
        0, 0, 400, 400
      );
      onSave(canvas.toDataURL('image/jpeg', 0.9));
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.9)', zIndex: 10000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
          <X size={28} />
        </button>
      </div>

      <div style={{ position: 'relative', width: '250px', height: '250px', overflow: 'hidden', borderRadius: '125px', background: '#222' }}
           onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
           onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleMouseUp}>
        <img ref={imgRef} src={image} alt="To crop" crossOrigin="anonymous" style={{
          position: 'absolute', transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: '0 0', cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none', WebkitUserDrag: 'none'
        }} />
        <div style={{ position: 'absolute', inset: 0, boxShadow: '0 0 0 1000px rgba(0,0,0,0.5)', pointerEvents: 'none', borderRadius: '125px', border: '2px solid var(--primary-color)' }}></div>
      </div>

      <div style={{ width: '100%', maxWidth: '300px', marginTop: '30px' }}>
        <input type="range" min="0.5" max="3" step="0.01" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} style={{ width: '100%' }} />
      </div>

      <button className="btn-primary" onClick={handleCrop} style={{ marginTop: '30px', width: '200px' }}>Salvar Foto</button>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default PhotoEditorModal;
