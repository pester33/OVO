import json, sys, math
raw=json.load(open(sys.argv[1])); secs=json.load(open(sys.argv[2])); out=sys.argv[3]
def r(v): 
    v=round(float(v),2); return int(v) if v==int(v) else v
levels=[]
for L in raw:
    objs=[]
    for o in L['objs']:
        e={}
        v=o.get('v') or {}
        t=o['t']
        if t in('Spike','Spike2') and v.get('hardOnly')=='true': e['hard']=1
        if t=='JumpBoost': e['f']=float(v.get('Force',0.7)); e['dc']=1 if v.get('Decel')=='true' else 0
        if t=='Portal':
            e.update(id=int(v['ID']),tg=int(v['Target']),fa=1 if v['ForceAngle']=='true' else 0,fan=float(v['ForcedAngle']),
                     fs=1 if v['ForceSpeed']=='true' else 0,fsp=float(v['ForcedSpeed']),inv=1 if v['InversePortal']=='true' else 0)
        if t=='RocketLauncher': e['sp']=float(v.get('RocketSpeed',-1)); e['on']=0 if v.get('CanShoot')=='false' else 1
        if t=='ButtonTrigger': e['id']=int(v['ID'])
        if t=='MoveArea':
            z=o['zz']
            e.update(id=int(v['ID']),imp=float(v['Importance']),nest=1 if v['Nested']=='true' else 0,grab=1 if v['GrabOnStart']=='true' else 0,
              par=int(v['Parent']),cmd=z['commands'],st=1 if z['start']=='Yes' else 0,rep=int(z['repeat-count']),rot=1 if z['rotatable']=='Yes' else 0,
              ms=float(z['max-moving-speed']),ma=float(z['moving-acceleration']),md=float(z['moving-deceleration']),
              rs=float(z['max-rotation-speed']),ra=float(z['rotation-acceleration']),rd=float(z['rotation-deceleration']),ia=float(z['initial-angle']))
        if 'text' in o: e['tx']=o['text']; e['sc']=o['scale']; e['al']=o['al']
        if o.get('inv'): e['inv']=1
        e['uid']=o['uid']
        objs.append([t,r(o['x']),r(o['y']),r(o['w']),r(o['h']),r(o['hx']),r(o['hy']),r(math.degrees(o['a'])),e])
    levels.append({'n':L['n'],'w':L['w'],'h':L['h'],'bg':L['bg'] or '255,255,255','objs':objs})
open(out,'w').write('window.OVO_SECTIONS='+json.dumps(secs,separators=(',',':'))+';\nwindow.OVO_LEVELS='+json.dumps(levels,separators=(',',':'),ensure_ascii=False)+';\n')
import os;print(os.path.getsize(out))
