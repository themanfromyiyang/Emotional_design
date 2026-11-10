"""Build a local GBIF occurrence-count snapshot from official EPSG:4326 MVT tiles."""
import json, struct, urllib.request
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent

def aggregate(points, step=0.714):
    cells = {}
    for lng, lat, count in points:
        key = (min(int((lng+180)//step), int(360/step)-1),
               min(int((lat+90)//step), int(180/step)-1))
        cells[key] = cells.get(key, 0) + count
    return [[round(-180+(x+.5)*step,4), round(-90+(y+.5)*step,4), count]
            for (x,y),count in sorted(cells.items())]

def varint(b, i=0):
    n = shift = 0
    while True:
        v = b[i]; i += 1; n |= (v & 127) << shift
        if v < 128: return n, i
        shift += 7

def fields(b):
    i = 0
    while i < len(b):
        tag, i = varint(b, i); kind = tag & 7
        if kind == 0: v, i = varint(b, i)
        elif kind == 2:
            size, i = varint(b, i); v = b[i:i+size]; i += size
        elif kind in (1, 5):
            size = 8 if kind == 1 else 4
            v = struct.unpack('<d' if kind == 1 else '<f', b[i:i+size])[0]; i += size
        else: raise ValueError(kind)
        yield tag >> 3, v

def packed(b):
    out = []; i = 0
    while i < len(b):
        v, i = varint(b, i); out.append(v)
    return out

def points(data, tile):
    for number, layer in fields(data):
        if number != 3: continue
        fs = list(fields(layer))
        keys = [v.decode() for k,v in fs if k == 3]
        values = [list(fields(v))[0][1] for k,v in fs if k == 4]
        extent = next((v for k,v in fs if k == 5), 4096)
        for k, feature in fs:
            if k != 2: continue
            f = dict(fields(feature)); tags = packed(f[2])
            props = {keys[tags[i]]:values[tags[i+1]] for i in range(0,len(tags),2)}
            count = props.get('total', 0)
            if not count: continue
            geom = packed(f[4]); i = x = y = 0; coords = []
            while i < len(geom):
                command = geom[i]; i += 1; op = command & 7
                if op == 7: continue
                for _ in range(command >> 3):
                    dx,dy = geom[i:i+2]; i += 2
                    x += (dx >> 1) ^ -(dx & 1); y += (dy >> 1) ^ -(dy & 1)
                    coords.append((x,y))
            cx = (min(p[0] for p in coords)+max(p[0] for p in coords))/2
            cy = (min(p[1] for p in coords)+max(p[1] for p in coords))/2
            if not (0 <= cx < extent and 0 <= cy < extent): continue
            yield [round(-180+180*tile+cx/extent*180,4), round(90-cy/extent*180,4), count]

if __name__ == '__main__':
    result = []; urls = []
    for tile in (0,1):
        url = f'https://api.gbif.org/v2/map/occurrence/density/0/{tile}/0.mvt?srs=EPSG:4326&bin=square&squareSize=2'
        urls.append(url)
        with urllib.request.urlopen(url, timeout=90) as response: data = response.read()
        result.extend(points(data,tile))
    source_cells = len(result)
    result = aggregate(result)
    output = {'source':'GBIF occurrence density','retrieved':datetime.now(timezone.utc).isoformat(),'urls':urls,'metric':'occurrence count, not species richness','gridDegrees':0.714,'sourceCells':source_cells,'points':result}
    (ROOT/'assets'/'occurrence-density.json').write_text(json.dumps(output,separators=(',',':')),encoding='utf-8')
    print(len(result), 'occupied cells;', sum(p[2] for p in result), 'records')
