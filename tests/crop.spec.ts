import { describe, it, expect } from 'vitest';
import { computeWhiteBgBoundsFromImageData, type ContentBounds } from '../src/hooks/useImageProcessing';

function makeImageData(sw: number, sh: number, bg = [255,255,255,255]): Uint8ClampedArray {
  const arr = new Uint8ClampedArray(sw * sh * 4);
  for (let i=0;i<sw*sh;i++) {
    const o = i*4; arr[o]=bg[0]; arr[o+1]=bg[1]; arr[o+2]=bg[2]; arr[o+3]=bg[3];
  }
  return arr;
}

function drawRect(data: Uint8ClampedArray, sw: number, rect: ContentBounds, color=[0,0,0,255]){
  for (let y=rect.y; y<rect.y+rect.height; y++){
    for (let x=rect.x; x<rect.x+rect.width; x++){
      const o=(y*sw+x)*4; data[o]=color[0]; data[o+1]=color[1]; data[o+2]=color[2]; data[o+3]=color[3];
    }
  }
}

describe('computeWhiteBgBoundsFromImageData', () => {
  it('detects tight bounds on white background', () => {
    const sw=100, sh=80; const data = makeImageData(sw, sh);
    const rect: ContentBounds = { x: 10, y: 12, width: 30, height: 20 };
    drawRect(data, sw, rect, [10,10,10,255]);
    const b = computeWhiteBgBoundsFromImageData(data, sw, sh, 248);
    expect(b).toBeTruthy();
    expect(b!.x).toBe(rect.x);
    expect(b!.y).toBe(rect.y);
    expect(b!.width).toBe(rect.width);
    expect(b!.height).toBe(rect.height);
  });

  it('ignores transparent pixels as foreground', () => {
    const sw=50, sh=40; const data = makeImageData(sw, sh);
    // draw semi-transparent black outside expected rect
    drawRect(data, sw, { x:0,y:0,width:50,height:10 }, [0,0,0,0]);
    const rect: ContentBounds = { x: 5, y: 15, width: 10, height: 8 };
    drawRect(data, sw, rect, [0,0,0,255]);
    const b = computeWhiteBgBoundsFromImageData(data, sw, sh, 248);
    expect(b).toEqual(rect);
  });
});

