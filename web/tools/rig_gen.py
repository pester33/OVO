# Translate the original "Player > Animations" event group (Player.xml) into JavaScript.
import sys, re, xml.etree.ElementTree as ET
root = ET.parse(sys.argv[1]).getroot()
grp = None
for g in root.iter('event-group'):
    if g.get('title') == 'Player > Animations': grp = g
PARTS = ['Head','Body','LeftArm','LeftHand','LeftLeg','LeftFoot','RightArm','RightHand','RightLeg','RightFoot']

def expr(e):
    e = e.strip()
    e = re.sub(r'Collider\.ImagePoint([XY])\((\d+)\)', lambda m: f'C.ip{m.group(1).lower()}({m.group(2)})', e)
    e = re.sub(r'Collider\.Platform\.(\w+)', r'C.\1', e)
    e = re.sub(r'Collider\.(\w+)', r'C.\1', e)
    e = re.sub(r'Self\.(\w+)', lambda m: {'X':'S.x','Y':'S.y','Angle':'S.a','Height':'S.h','Width':'S.w','ImageHeight':'S.ih','ImageWidth':'S.iw'}[m.group(1)], e)
    for p in PARTS: e = re.sub(r'\b%s\.(\w+)' % p, lambda m, p=p: 'R.%s.%s' % (p, {'Angle':'a','X':'x','Y':'y','Height':'h'}[m.group(1)]), e)
    e = re.sub(r'\bsin\(', 'dsin(', e); e = re.sub(r'\bcos\(', 'dcos(', e)
    e = re.sub(r'\btime\b', 'T', e); e = re.sub(r'\bdt\b', 'DT', e)
    e = re.sub(r'(?<![<>=!])=(?!=)', '==', e); e = e.replace('<>', '!=')
    e = re.sub(r'(?<!&)&(?!&)', '&&', e)
    return e

oid = [0]
def cond(c):
    nm = c.get('name'); t = c.get('type'); ps = [(p.text or '').strip() for p in c.findall('param')]
    inv = c.get('inverted') == '1'
    if nm == 'Compare instance variable' and t == 'Collider':
        var = ps[0]; op = ['==','!=','<','<=','>','>='][int(ps[1])]; r = f'(C.{var} {op} {expr(ps[2])})'
    elif nm == 'Trigger once while true': oid[0] += 1; r = f'once({oid[0]})'
    elif nm == 'On jump': r = 'C.jumped'
    elif nm == 'On landed': r = 'C.landed'
    elif nm in ('Every tick', 'For Each', 'Compare two values'): r = 'true'
    else: raise Exception('cond ' + nm)
    return ('!' if inv else '') + r

def action(a):
    nm = a.get('name'); t = a.get('type'); ps = [(p.text or '').strip() for p in a.findall('param')]
    if t == 'System' and nm == 'Wait': return ''
    S = f'R.{t}'
    if nm == 'Set position': return f'{{const S={S}; const _x={expr(ps[0])}, _y={expr(ps[1])}; S.x=_x; S.y=_y;}}'
    if nm == 'Set X': return f'{{const S={S}; S.x={expr(ps[0])};}}'
    if nm == 'Set Y': return f'{{const S={S}; S.y={expr(ps[0])};}}'
    if nm == 'Set angle': return f'{{const S={S}; S.a=norm({expr(ps[0])});}}'
    if nm == 'Set height': return f'{{const S={S}; S.h={expr(ps[0])};}}'
    if nm == 'Set mirrored': return f'{{{S}.mir = {ps[0]}==0 ? -1 : 1;}}'
    if nm == 'Set position to another object':
        ip = ps[1]; ip = ip if ip.startswith('"') else ip
        return f'{{const p=ipos(R.{ps[0]}, {ip}); {S}.x=p[0]; {S}.y=p[1];}}'
    raise Exception('act ' + nm)

out = []
def walk(node, d):
    prev_else_chain = False
    for ch in node:
        if ch.tag != 'event-block': continue
        cs = ch.find('conditions'); conds = list(cs) if cs is not None else []
        is_else = any(c.get('name') == 'Else' for c in conds)
        conds = [c for c in conds if c.get('name') != 'Else']
        if ch.get('any') == '1': ce = ' || '.join(cond(c) for c in conds) or 'true'
        else: ce = ' && '.join(cond(c) for c in conds) or 'true'
        ind = '  ' * d
        out.append(f'{ind}{"else " if is_else else ""}if ({ce}) {{')
        acts = ch.find('actions')
        if acts is not None:
            for a in acts:
                s = action(a)
                if s: out.append(ind + '  ' + s)
        se = ch.find('sub-events')
        if se is not None: walk(se, d + 1)
        out.append(ind + '}')
walk(grp.find('sub-events'), 1)
js = '''/* Generated from the original OvO Player.xml "Player > Animations" event group by tools/rig_gen.py */
window.OvORigAnimate = function (R, C, DT, T, once, ipos) {
  const dsin = d => Math.sin(d * Math.PI / 180), dcos = d => Math.cos(d * Math.PI / 180);
  const norm = a => ((a % 360) + 360) % 360;
  const lerp = (a, b, t) => a + (b - a) * t;
  const anglelerp = (a, b, t) => { let d = ((b - a) % 360 + 540) % 360 - 180; return a + d * t; };
  const abs = Math.abs, min = Math.min, max = Math.max;
''' + '\n'.join(out) + '\n};\n'
open(sys.argv[2], 'w').write(js)
print(len(out), 'lines')
