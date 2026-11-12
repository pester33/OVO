/* Generated from the original OvO Player.xml "Player > Animations" event group by tools/rig_gen.py */
window.OvORigAnimate = function (R, C, DT, T, once, ipos) {
  const dsin = d => Math.sin(d * Math.PI / 180), dcos = d => Math.cos(d * Math.PI / 180);
  const norm = a => ((a % 360) + 360) % 360;
  const lerp = (a, b, t) => a + (b - a) * t;
  const anglelerp = (a, b, t) => { let d = ((b - a) % 360 + 540) % 360 - 180; return a + d * t; };
  const abs = Math.abs, min = Math.min, max = Math.max;
  if (true) {
    {const S=R.Body; const _x=C.ipx(2), _y=C.ipy(2); S.x=_x; S.y=_y;}
    if ((C.State == "idle")) {
      {const S=R.Body; const _x=C.ipx(2), _y=C.ipy(2); S.x=_x; S.y=_y;}
      {const S=R.Body; S.a=norm(anglelerp(S.a, C.Angle, 0.2 * DT * 60));}
      {const S=R.Body; S.a=norm(anglelerp(S.a, 0, 0.2 * DT * 60));}
      if (true) {
        {const p=ipos(R.Body, "Head"); R.Head.x=p[0]; R.Head.y=p[1];}
        {const S=R.Head; S.a=norm(anglelerp(S.a, R.Body.a,0.2 * DT * 60));}
      }
      if (true) {
        {const p=ipos(R.Body, "LeftA"); R.LeftArm.x=p[0]; R.LeftArm.y=p[1];}
        {const S=R.LeftArm; S.x=C.Side < 0? S.x +8 : S.x;}
        {const S=R.LeftArm; S.a=norm(anglelerp(S.a, R.Body.a,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftArm, 1); R.LeftHand.x=p[0]; R.LeftHand.y=p[1];}
          {const S=R.LeftHand; S.a=norm(anglelerp(S.a,R.LeftArm.a,0.2 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightA"); R.RightArm.x=p[0]; R.RightArm.y=p[1];}
        {const S=R.RightArm; S.x=C.Side < 0? S.x -8 : S.x;}
        {const S=R.RightArm; S.a=norm(anglelerp(S.a, R.Body.a,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightArm, 1); R.RightHand.x=p[0]; R.RightHand.y=p[1];}
          {const S=R.RightHand; S.a=norm(anglelerp(S.a,R.RightArm.a,0.2 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "LeftL"); R.LeftLeg.x=p[0]; R.LeftLeg.y=p[1];}
        {const S=R.LeftLeg; S.x=C.Side < 0? S.x +4 : S.x;}
        {const S=R.LeftLeg; S.a=norm(anglelerp(S.a, R.Body.a,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftLeg, 1); R.LeftFoot.x=p[0]; R.LeftFoot.y=p[1];}
          {const S=R.LeftFoot; S.a=norm(anglelerp(S.a,R.LeftLeg.a,0.2 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightL"); R.RightLeg.x=p[0]; R.RightLeg.y=p[1];}
        {const S=R.RightLeg; S.x=C.Side < 0? S.x +4 : S.x;}
        {const S=R.RightLeg; S.a=norm(anglelerp(S.a, R.Body.a,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightLeg, 1); R.RightFoot.x=p[0]; R.RightFoot.y=p[1];}
          {const S=R.RightFoot; S.a=norm(anglelerp(S.a,R.RightLeg.a,0.2 * DT * 60));}
        }
      }
    }
    if ((C.State == "wavedashFall")) {
      {const S=R.Body; const _x=C.ipx(2), _y=C.ipy(2); S.x=_x; S.y=_y;}
      {const S=R.Body; S.a=norm(anglelerp(S.a, 0, 0.2 * DT * 60));}
      if (once(1)) {
        {const S=R.Body; S.a=norm(C.Side);}
      }
      if (true) {
        {const S=R.Body; S.a=norm(lerp(S.a, (360 - C.Side)%360, 0.2 * DT * 60));}
      }
      if (true) {
        {const p=ipos(R.Body, "Head"); R.Head.x=p[0]; R.Head.y=p[1];}
        {const S=R.Head; S.a=norm(anglelerp(S.a, R.Body.a,0.2 * DT * 60));}
      }
      if (true) {
        {const p=ipos(R.Body, "LeftA"); R.LeftArm.x=p[0]; R.LeftArm.y=p[1];}
        {const S=R.LeftArm; S.x=C.Side < 0? S.x +8 : S.x;}
        {const S=R.LeftArm; S.a=norm(anglelerp(S.a, R.Body.a,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftArm, 1); R.LeftHand.x=p[0]; R.LeftHand.y=p[1];}
          {const S=R.LeftHand; S.a=norm(anglelerp(S.a,R.LeftArm.a,0.2 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightA"); R.RightArm.x=p[0]; R.RightArm.y=p[1];}
        {const S=R.RightArm; S.x=C.Side < 0? S.x -8 : S.x;}
        {const S=R.RightArm; S.a=norm(anglelerp(S.a, R.Body.a,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightArm, 1); R.RightHand.x=p[0]; R.RightHand.y=p[1];}
          {const S=R.RightHand; S.a=norm(anglelerp(S.a,R.RightArm.a,0.2 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "LeftL"); R.LeftLeg.x=p[0]; R.LeftLeg.y=p[1];}
        {const S=R.LeftLeg; S.x=C.Side < 0? S.x +4 : S.x;}
        {const S=R.LeftLeg; S.a=norm(anglelerp(S.a, R.Body.a,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftLeg, 1); R.LeftFoot.x=p[0]; R.LeftFoot.y=p[1];}
          {const S=R.LeftFoot; S.a=norm(anglelerp(S.a,R.LeftLeg.a,0.2 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightL"); R.RightLeg.x=p[0]; R.RightLeg.y=p[1];}
        {const S=R.RightLeg; S.x=C.Side < 0? S.x +4 : S.x;}
        {const S=R.RightLeg; S.a=norm(anglelerp(S.a, R.Body.a,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightLeg, 1); R.RightFoot.x=p[0]; R.RightFoot.y=p[1];}
          {const S=R.RightFoot; S.a=norm(anglelerp(S.a,R.RightLeg.a,0.2 * DT * 60));}
        }
      }
    }
    else if ((C.State == "wavedash")) {
      {const S=R.Body; const _x=C.ipx(2), _y=C.ipy(2) + 8; S.x=_x; S.y=_y;}
      {const S=R.Body; S.a=norm(anglelerp(S.a, C.Angle + 8 * C.Side, 0.2 * DT * 60));}
      {const S=R.Body; S.a=norm(anglelerp(S.a, 0, 0.2 * DT * 60));}
      if (true) {
        {const p=ipos(R.Body, "Head"); R.Head.x=p[0]; R.Head.y=p[1];}
        {const S=R.Head; S.a=norm(anglelerp(S.a, R.Body.a,0.2 * DT * 60));}
      }
      if (true) {
        {const p=ipos(R.Body, "LeftA"); R.LeftArm.x=p[0]; R.LeftArm.y=p[1];}
        {const S=R.LeftArm; S.x=C.Side < 0? S.x +8 : S.x;}
        {const S=R.LeftArm; S.a=norm(anglelerp(S.a, R.Body.a + C.Side * 60,0.5 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftArm, 1); R.LeftHand.x=p[0]; R.LeftHand.y=p[1];}
          {const S=R.LeftHand; S.a=norm(anglelerp(S.a,R.LeftArm.a - C.Side * 20,0.5 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightA"); R.RightArm.x=p[0]; R.RightArm.y=p[1];}
        {const S=R.RightArm; S.x=C.Side < 0? S.x -8 : S.x;}
        {const S=R.RightArm; S.a=norm(anglelerp(S.a, R.Body.a - C.Side * 60,0.5 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightArm, 1); R.RightHand.x=p[0]; R.RightHand.y=p[1];}
          {const S=R.RightHand; S.a=norm(anglelerp(S.a,R.RightArm.a + C.Side * 20,0.5 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "LeftL"); R.LeftLeg.x=p[0]; R.LeftLeg.y=p[1];}
        {const S=R.LeftLeg; S.x=C.Side < 0? S.x +4 : S.x;}
        {const S=R.LeftLeg; S.a=norm(anglelerp(S.a, R.Body.a,0.5 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftLeg, 1); R.LeftFoot.x=p[0]; R.LeftFoot.y=p[1];}
          {const S=R.LeftFoot; S.a=norm(anglelerp(S.a,R.LeftLeg.a + C.Side * 90,0.5 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightL"); R.RightLeg.x=p[0]; R.RightLeg.y=p[1];}
        {const S=R.RightLeg; S.x=C.Side < 0? S.x +4 : S.x;}
        {const S=R.RightLeg; S.a=norm(anglelerp(S.a, R.Body.a  - 90 * C.Side,0.5 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightLeg, 1); R.RightFoot.x=p[0]; R.RightFoot.y=p[1];}
          {const S=R.RightFoot; S.a=norm(anglelerp(S.a,R.RightLeg.a + C.Side * 90,0.5 * DT * 60));}
        }
      }
    }
    else if ((C.State == "wall")) {
      {const S=R.Body; const _x=C.ipx(2), _y=C.ipy(2); S.x=_x; S.y=_y;}
      {const S=R.Body; S.a=norm(anglelerp(S.a, C.Angle, 0.2 * DT * 60));}
      {const S=R.Body; S.a=norm(anglelerp(S.a, 0, 0.2 * DT * 60));}
      if (true) {
        {const p=ipos(R.Body, "Head"); R.Head.x=p[0]; R.Head.y=p[1];}
        {const S=R.Head; S.a=norm(anglelerp(S.a, R.Body.a,0.2 * DT * 60));}
      }
      if (true) {
        {const p=ipos(R.Body, "LeftA"); R.LeftArm.x=p[0]; R.LeftArm.y=p[1];}
        {const S=R.LeftArm; S.x=C.Side < 0? S.x +8 : S.x;}
        {const S=R.LeftArm; S.a=norm(anglelerp(S.a,C.Side * 280 + R.Body.a,0.1 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftArm, 1); R.LeftHand.x=p[0]; R.LeftHand.y=p[1];}
          {const S=R.LeftHand; S.a=norm(R.LeftArm.a - C.Side * 20);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightA"); R.RightArm.x=p[0]; R.RightArm.y=p[1];}
        {const S=R.RightArm; S.x=C.Side < 0? S.x -8 : S.x;}
        {const S=R.RightArm; S.a=norm(anglelerp(S.a,C.Side * 280 + R.Body.a,0.1 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightArm, 1); R.RightHand.x=p[0]; R.RightHand.y=p[1];}
          {const S=R.RightHand; S.a=norm(R.RightArm.a - C.Side * 20);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "LeftL"); R.LeftLeg.x=p[0]; R.LeftLeg.y=p[1];}
        {const S=R.LeftLeg; S.x=C.Side < 0? S.x +4 : S.x;}
        {const S=R.LeftLeg; S.a=norm(anglelerp(S.a, R.Body.a,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftLeg, 1); R.LeftFoot.x=p[0]; R.LeftFoot.y=p[1];}
          {const S=R.LeftFoot; S.a=norm(anglelerp(S.a,R.LeftLeg.a,0.2 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightL"); R.RightLeg.x=p[0]; R.RightLeg.y=p[1];}
        {const S=R.RightLeg; S.x=C.Side < 0? S.x +4 : S.x;}
        {const S=R.RightLeg; S.a=norm(anglelerp(S.a, R.Body.a,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightLeg, 1); R.RightFoot.x=p[0]; R.RightFoot.y=p[1];}
          {const S=R.RightFoot; S.a=norm(anglelerp(S.a,R.RightLeg.a,0.2 * DT * 60));}
        }
      }
    }
    else if ((C.State == "triplejump")) {
      {const S=R.Body; const _x=C.ipx(2), _y=C.ipy(2); S.x=_x; S.y=_y;}
      {const S=R.Body; S.a=norm(anglelerp(S.a, C.Angle + 10 * C.Side, 0.2 * DT * 60));}
      {const S=R.Body; S.a=norm(anglelerp(S.a, 0, 0.2 * DT * 60));}
      if (true) {
        {const p=ipos(R.Body, "Head"); R.Head.x=p[0]; R.Head.y=p[1];}
        {const S=R.Head; S.a=norm(anglelerp(S.a, R.Body.a - 10 * C.Side,0.2 * DT * 60));}
      }
      if (true) {
        {const p=ipos(R.Body, "LeftA"); R.LeftArm.x=p[0]; R.LeftArm.y=p[1];}
        {const S=R.LeftArm; S.x=C.Side < 0? S.x +8 : S.x;}
        {const S=R.LeftArm; S.a=norm(anglelerp(S.a,C.Side * 70  + dsin(T * 300) * 5 + R.Body.a,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftArm, 1); R.LeftHand.x=p[0]; R.LeftHand.y=p[1];}
          {const S=R.LeftHand; S.a=norm(R.LeftArm.a - C.Side * 20);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightA"); R.RightArm.x=p[0]; R.RightArm.y=p[1];}
        {const S=R.RightArm; S.x=C.Side < 0? S.x -8 : S.x;}
        {const S=R.RightArm; S.a=norm(anglelerp(S.a,C.Side * 350 + dsin(T * 300) * 5 + R.Body.a,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightArm, 1); R.RightHand.x=p[0]; R.RightHand.y=p[1];}
          {const S=R.RightHand; S.a=norm(R.RightArm.a - C.Side * 20);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "LeftL"); R.LeftLeg.x=p[0]; R.LeftLeg.y=p[1];}
        {const S=R.LeftLeg; S.x=C.Side < 0? S.x +4 : S.x;}
        {const S=R.LeftLeg; S.a=norm(anglelerp(S.a, R.Body.a + dcos(T * 100) * 5 + 30 * C.Side,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftLeg, 1); R.LeftFoot.x=p[0]; R.LeftFoot.y=p[1];}
          {const S=R.LeftFoot; S.a=norm(anglelerp(S.a,R.LeftLeg.a + dcos(T * 80) * 20 + 30 * C.Side,0.2 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightL"); R.RightLeg.x=p[0]; R.RightLeg.y=p[1];}
        {const S=R.RightLeg; S.x=C.Side < 0? S.x +4 : S.x;}
        {const S=R.RightLeg; S.a=norm(anglelerp(S.a, R.Body.a + dcos(T * 100) * 5 - 10 * C.Side,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightLeg, 1); R.RightFoot.x=p[0]; R.RightFoot.y=p[1];}
          {const S=R.RightFoot; S.a=norm(anglelerp(S.a,R.RightLeg.a + dcos(T * 80) * 20 + 20 * C.Side,0.2 * DT * 60));}
        }
      }
    }
    else if ((C.State == "dancing")) {
      {const S=R.Body; const _x=C.ipx(2), _y=C.ipy(2); S.x=_x; S.y=_y;}
      {const S=R.Body; S.a=norm(anglelerp(S.a, C.Angle + 10 * C.Side, 0.2 * DT * 60));}
      {const S=R.Body; S.a=norm(anglelerp(S.a, 0, 0.2 * DT * 60));}
      if (true) {
        {const p=ipos(R.Body, "Head"); R.Head.x=p[0]; R.Head.y=p[1];}
        {const S=R.Head; S.a=norm(anglelerp(S.a, R.Body.a - 10 * C.Side,0.2 * DT * 60));}
      }
      if (true) {
        {const p=ipos(R.Body, "LeftA"); R.LeftArm.x=p[0]; R.LeftArm.y=p[1];}
        {const S=R.LeftArm; S.x=C.Side < 0? S.x +8 : S.x;}
        {const S=R.LeftArm; S.a=norm(anglelerp(S.a,C.Side * 100  + dsin(T * 300) * 5 + R.Body.a,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftArm, 1); R.LeftHand.x=p[0]; R.LeftHand.y=p[1];}
          {const S=R.LeftHand; S.a=norm(R.LeftArm.a - C.Side * 20);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightA"); R.RightArm.x=p[0]; R.RightArm.y=p[1];}
        {const S=R.RightArm; S.x=C.Side < 0? S.x -8 : S.x;}
        {const S=R.RightArm; S.a=norm(anglelerp(S.a,C.Side * 280 + dsin(T * 300) * 5 + R.Body.a,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightArm, 1); R.RightHand.x=p[0]; R.RightHand.y=p[1];}
          {const S=R.RightHand; S.a=norm(R.RightArm.a - C.Side * 20);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "LeftL"); R.LeftLeg.x=p[0]; R.LeftLeg.y=p[1];}
        {const S=R.LeftLeg; S.x=C.Side < 0? S.x +4 : S.x;}
        {const S=R.LeftLeg; S.a=norm(anglelerp(S.a, R.Body.a + dcos(T * 100) * 5 + 70 * C.Side,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftLeg, 1); R.LeftFoot.x=p[0]; R.LeftFoot.y=p[1];}
          {const S=R.LeftFoot; S.a=norm(anglelerp(S.a,R.LeftLeg.a + dcos(T * 80) * 20 + 30 * C.Side,0.2 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightL"); R.RightLeg.x=p[0]; R.RightLeg.y=p[1];}
        {const S=R.RightLeg; S.x=C.Side < 0? S.x +4 : S.x;}
        {const S=R.RightLeg; S.a=norm(anglelerp(S.a, R.Body.a - 20 * C.Side,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightLeg, 1); R.RightFoot.x=p[0]; R.RightFoot.y=p[1];}
          {const S=R.RightFoot; S.a=norm(anglelerp(S.a,R.RightLeg.a + 10 * C.Side,0.2 * DT * 60));}
        }
      }
    }
    else if ((C.State == "dancing")) {
      {const S=R.Body; const _x=C.ipx(2), _y=C.ipy(2); S.x=_x; S.y=_y;}
      {const S=R.Body; S.a=norm(C.Side * (-10 + 10 * dsin(T * 60 * 15)) + C.Angle);}
      {const S=R.Body; S.a=norm(C.Side * (15 + 5 * dsin(T * 60 * 15)));}
      if (true) {
        {const p=ipos(R.Body, "Head"); R.Head.x=p[0]; R.Head.y=p[1];}
        {const S=R.Head; S.a=norm(R.Body.a + C.Side * (10 * dcos(T * 60 * 15) - 5));}
      }
      if (true) {
        {const p=ipos(R.Body, "LeftA"); R.LeftArm.x=p[0]; R.LeftArm.y=p[1];}
        {const S=R.LeftArm; S.x=C.Side < 0? S.x +8 : S.x;}
        {const S=R.LeftArm; S.a=norm((C.Skin == "ada"? C.Side *  160 : C.Side *  45 - 45 * dcos(T * 60 * 8)) + R.Body.a);}
        if (true) {
          {const p=ipos(R.LeftArm, 1); R.LeftHand.x=p[0]; R.LeftHand.y=p[1];}
          {const S=R.LeftHand; S.a=norm(C.Skin == "ada"? R.LeftArm.a : R.LeftArm.a - C.Side * 90 - 45 * dcos(T * 60 * 8));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightA"); R.RightArm.x=p[0]; R.RightArm.y=p[1];}
        {const S=R.RightArm; S.x=C.Side < 0? S.x -8 : S.x;}
        {const S=R.RightArm; S.a=norm((C.Skin == "ada"? C.Side*120 : - 45 * dcos(180 + T * 60 * 8)) + R.Body.a);}
        if (true) {
          {const p=ipos(R.RightArm, 1); R.RightHand.x=p[0]; R.RightHand.y=p[1];}
          {const S=R.RightHand; S.a=norm(C.Skin == "ada"? R.RightArm.a : R.RightArm.a - C.Side * 90 - 45 * dcos(180 + T * 60 * 8));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "LeftL"); R.LeftLeg.x=p[0]; R.LeftLeg.y=p[1];}
        {const S=R.LeftLeg; S.a=norm(C.Side* 90 * dcos(T * 60 * 8) + R.Body.a);}
        if (true) {
          {const p=ipos(R.LeftLeg, 1); R.LeftFoot.x=p[0]; R.LeftFoot.y=p[1];}
          {const S=R.LeftFoot; S.a=norm(R.LeftLeg.a +C.Side* (90 + 90 * dsin(T * 60 * 8)));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightL"); R.RightLeg.x=p[0]; R.RightLeg.y=p[1];}
        {const S=R.RightLeg; S.a=norm(C.Side* 90 * dcos(180+T * 60 * 8) + R.Body.a);}
        if (true) {
          {const p=ipos(R.RightLeg, 1); R.RightFoot.x=p[0]; R.RightFoot.y=p[1];}
          {const S=R.RightFoot; S.a=norm(R.RightLeg.a +C.Side* (90 + 90 * dsin(180+T * 60 * 8)));}
        }
      }
    }
    else if ((C.State == "run")) {
      {const S=R.Body; const _x=C.ipx(2), _y=C.ipy(2); S.x=_x; S.y=_y;}
      {const S=R.Body; S.a=norm(C.Side * (15 + 5 * dsin(T * 60 * 15)) + C.Angle);}
      {const S=R.Body; S.a=norm(C.Side * (15 + 5 * dsin(T * 60 * 15)));}
      if (true) {
        {const p=ipos(R.Body, "Head"); R.Head.x=p[0]; R.Head.y=p[1];}
        {const S=R.Head; S.a=norm(R.Body.a + C.Side * (10 * dcos(T * 60 * 20)));}
      }
      if (true) {
        {const p=ipos(R.Body, "LeftA"); R.LeftArm.x=p[0]; R.LeftArm.y=p[1];}
        {const S=R.LeftArm; S.x=C.Side < 0? S.x +8 : S.x;}
        {const S=R.LeftArm; S.a=norm((C.Skin == "ada"? C.Side *  120 : C.Side *  45 - 45 * dcos(T * 60 * 10)) + R.Body.a);}
        if (true) {
          {const p=ipos(R.LeftArm, 1); R.LeftHand.x=p[0]; R.LeftHand.y=p[1];}
          {const S=R.LeftHand; S.a=norm(C.Skin == "ada"? R.LeftArm.a : R.LeftArm.a - C.Side * 90 - 45 * dcos(T * 60 * 10));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightA"); R.RightArm.x=p[0]; R.RightArm.y=p[1];}
        {const S=R.RightArm; S.x=C.Side < 0? S.x -8 : S.x;}
        {const S=R.RightArm; S.a=norm((C.Skin == "ada"? C.Side*120 : - 45 * dcos(180 + T * 60 * 10)) + R.Body.a);}
        if (true) {
          {const p=ipos(R.RightArm, 1); R.RightHand.x=p[0]; R.RightHand.y=p[1];}
          {const S=R.RightHand; S.a=norm(C.Skin == "ada"? R.RightArm.a : R.RightArm.a - C.Side * 90 - 45 * dcos(180 + T * 60 * 10));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "LeftL"); R.LeftLeg.x=p[0]; R.LeftLeg.y=p[1];}
        {const S=R.LeftLeg; S.a=norm(C.Side* 90 * dcos(T * 60 * 10) + R.Body.a);}
        if (true) {
          {const p=ipos(R.LeftLeg, 1); R.LeftFoot.x=p[0]; R.LeftFoot.y=p[1];}
          {const S=R.LeftFoot; S.a=norm(R.LeftLeg.a +C.Side* (90 + 90 * dsin(T * 60 * 10)));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightL"); R.RightLeg.x=p[0]; R.RightLeg.y=p[1];}
        {const S=R.RightLeg; S.a=norm(C.Side* 90 * dcos(180+T * 60 * 10) + R.Body.a);}
        if (true) {
          {const p=ipos(R.RightLeg, 1); R.RightFoot.x=p[0]; R.RightFoot.y=p[1];}
          {const S=R.RightFoot; S.a=norm(R.RightLeg.a +C.Side* (90 + 90 * dsin(180+T * 60 * 10)));}
        }
      }
    }
    else if ((C.State == "jump")) {
      {const S=R.Body; const _x=C.ipx(2), _y=C.ipy(2); S.x=_x; S.y=_y;}
      {const S=R.Body; S.a=norm(anglelerp(S.a,-C.Side * 10 + C.Angle ,0.05 * DT * 60));}
      if (true) {
        {const p=ipos(R.Body, "Head"); R.Head.x=p[0]; R.Head.y=p[1];}
        {const S=R.Head; S.a=norm(anglelerp(S.a, R.Body.a -C.Side * 20 ,0.05 * DT * 60));}
      }
      if (true) {
        {const p=ipos(R.Body, "LeftA"); R.LeftArm.x=p[0]; R.LeftArm.y=p[1];}
        {const S=R.LeftArm; S.x=C.Side < 0? S.x +8 : S.x;}
        {const S=R.LeftArm; S.a=norm(anglelerp(S.a, R.Body.a + C.Side * 5 ,0.1 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftArm, 1); R.LeftHand.x=p[0]; R.LeftHand.y=p[1];}
          {const S=R.LeftHand; S.a=norm(R.LeftArm.a  - C.Side * 20);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightA"); R.RightArm.x=p[0]; R.RightArm.y=p[1];}
        {const S=R.RightArm; S.x=C.Side < 0? S.x -8 : S.x;}
        {const S=R.RightArm; S.a=norm(anglelerp(S.a, R.Body.a + C.Side * 280 ,0.1 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightArm, 1); R.RightHand.x=p[0]; R.RightHand.y=p[1];}
          {const S=R.RightHand; S.a=norm(R.RightArm.a - C.Side * 20);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "LeftL"); R.LeftLeg.x=p[0]; R.LeftLeg.y=p[1];}
        {const S=R.LeftLeg; S.a=norm(anglelerp(S.a, R.Body.a + C.Side * 5 ,0.1 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftLeg, 1); R.LeftFoot.x=p[0]; R.LeftFoot.y=p[1];}
          {const S=R.LeftFoot; S.a=norm(R.LeftLeg.a + C.Side * 30);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightL"); R.RightLeg.x=p[0]; R.RightLeg.y=p[1];}
        {const S=R.RightLeg; S.a=norm(anglelerp(S.a, R.Body.a + C.Side * 280 ,0.1 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightLeg, 1); R.RightFoot.x=p[0]; R.RightFoot.y=p[1];}
          {const S=R.RightFoot; S.a=norm(R.RightLeg.a + C.Side * 20);}
        }
      }
    }
    else if ((C.State == "poundFloor")) {
      {const S=R.Body; const _x=C.ipx(2), _y=lerp(S.y, C.ipy(2), 0.3 * DT * 60); S.x=_x; S.y=_y;}
      {const S=R.Body; const _x=C.ipx(2), _y=C.ipy(2); S.x=_x; S.y=_y;}
      {const S=R.Body; S.a=norm(anglelerp(S.a, C.Angle, 0.2 * DT * 60));}
      {const S=R.Body; S.a=norm(anglelerp(S.a, 0, 0.2 * DT * 60));}
      if (once(2)) {
        {const S=R.Body; const _x=C.ipx(2), _y=C.ipy(2) + 12; S.x=_x; S.y=_y;}
        {const S=R.LeftArm; S.a=norm(R.Body.a + 120 * C.Side);}
        {const S=R.RightArm; S.a=norm(R.Body.a - 120 * C.Side);}
        {const S=R.LeftLeg; S.a=norm(R.Body.a - 80 * C.Side);}
        {const S=R.RightLeg; S.a=norm(R.Body.a - 80 * C.Side);}
        {const S=R.LeftFoot; S.a=norm(R.Body.a + 120 * C.Side);}
        {const S=R.RightFoot; S.a=norm(R.Body.a + 120 * C.Side);}
      }
      if (true) {
        {const p=ipos(R.Body, "Head"); R.Head.x=p[0]; R.Head.y=p[1];}
        {const S=R.Head; S.a=norm(anglelerp(S.a, R.Body.a,0.2 * DT * 60));}
      }
      if (true) {
        {const p=ipos(R.Body, "LeftA"); R.LeftArm.x=p[0]; R.LeftArm.y=p[1];}
        {const S=R.LeftArm; S.x=C.Side < 0? S.x +8 : S.x;}
        {const S=R.LeftArm; S.a=norm(anglelerp(S.a, R.Body.a,0.1 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftArm, 1); R.LeftHand.x=p[0]; R.LeftHand.y=p[1];}
          {const S=R.LeftHand; S.a=norm(anglelerp(S.a,R.Body.a,0.2 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightA"); R.RightArm.x=p[0]; R.RightArm.y=p[1];}
        {const S=R.RightArm; S.x=C.Side < 0? S.x -8 : S.x;}
        {const S=R.RightArm; S.a=norm(anglelerp(S.a, R.Body.a,0.1 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightArm, 1); R.RightHand.x=p[0]; R.RightHand.y=p[1];}
          {const S=R.RightHand; S.a=norm(anglelerp(S.a,R.Body.a,0.2 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "LeftL"); R.LeftLeg.x=p[0]; R.LeftLeg.y=p[1];}
        {const S=R.LeftLeg; S.x=C.Side < 0? S.x +4 : S.x;}
        {const S=R.LeftLeg; S.a=norm(anglelerp(S.a, R.Body.a,0.1 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftLeg, 1); R.LeftFoot.x=p[0]; R.LeftFoot.y=p[1];}
          {const S=R.LeftFoot; S.a=norm(anglelerp(S.a,R.Body.a,0.1 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightL"); R.RightLeg.x=p[0]; R.RightLeg.y=p[1];}
        {const S=R.RightLeg; S.x=C.Side < 0? S.x +4 : S.x;}
        {const S=R.RightLeg; S.a=norm(anglelerp(S.a, R.Body.a,0.1 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightLeg, 1); R.RightFoot.x=p[0]; R.RightFoot.y=p[1];}
          {const S=R.RightFoot; S.a=norm(anglelerp(S.a,R.Body.a,0.1 * DT * 60));}
        }
      }
    }
    else if ((C.State == "gpjump")) {
      {const S=R.Body; const _x=C.ipx(2), _y=C.ipy(2); S.x=_x; S.y=_y;}
      {const S=R.Body; S.a=norm(anglelerp(S.a, C.Angle, 0.2 * DT * 60));}
      {const S=R.Body; S.a=norm(anglelerp(S.a, 0, 0.2 * DT * 60));}
      if (true) {
        {const p=ipos(R.Body, "Head"); R.Head.x=p[0]; R.Head.y=p[1];}
        {const S=R.Head; S.a=norm(anglelerp(S.a, R.Body.a - 30 * C.Side,0.2 * DT * 60));}
      }
      if (true) {
        {const p=ipos(R.Body, "LeftA"); R.LeftArm.x=p[0]; R.LeftArm.y=p[1];}
        {const S=R.LeftArm; S.x=C.Side < 0? S.x +8 : S.x;}
        {const S=R.LeftArm; S.a=norm(anglelerp(S.a, R.Body.a,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftArm, 1); R.LeftHand.x=p[0]; R.LeftHand.y=p[1];}
          {const S=R.LeftHand; S.a=norm(anglelerp(S.a,R.LeftArm.a,0.2 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightA"); R.RightArm.x=p[0]; R.RightArm.y=p[1];}
        {const S=R.RightArm; S.x=C.Side < 0? S.x -8 : S.x;}
        {const S=R.RightArm; S.a=norm(anglelerp(S.a, R.Body.a,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightArm, 1); R.RightHand.x=p[0]; R.RightHand.y=p[1];}
          {const S=R.RightHand; S.a=norm(anglelerp(S.a,R.RightArm.a,0.2 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "LeftL"); R.LeftLeg.x=p[0]; R.LeftLeg.y=p[1];}
        {const S=R.LeftLeg; S.x=C.Side < 0? S.x +4 : S.x;}
        {const S=R.LeftLeg; S.a=norm(anglelerp(S.a, R.Body.a,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftLeg, 1); R.LeftFoot.x=p[0]; R.LeftFoot.y=p[1];}
          {const S=R.LeftFoot; S.a=norm(anglelerp(S.a,R.LeftLeg.a,0.2 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightL"); R.RightLeg.x=p[0]; R.RightLeg.y=p[1];}
        {const S=R.RightLeg; S.x=C.Side < 0? S.x +4 : S.x;}
        {const S=R.RightLeg; S.a=norm(anglelerp(S.a, R.Body.a,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightLeg, 1); R.RightFoot.x=p[0]; R.RightFoot.y=p[1];}
          {const S=R.RightFoot; S.a=norm(anglelerp(S.a,R.RightLeg.a,0.2 * DT * 60));}
        }
      }
    }
    else if ((C.State == "fall")) {
      {const S=R.Body; const _x=C.ipx(2), _y=C.ipy(2); S.x=_x; S.y=_y;}
      {const S=R.Body; S.a=norm(anglelerp(S.a,C.Side * 10 + C.Angle,0.05 * DT * 60));}
      if (true) {
        {const p=ipos(R.Body, "Head"); R.Head.x=p[0]; R.Head.y=p[1];}
        {const S=R.Head; S.a=norm(anglelerp(S.a, R.Body.a + C.Side * 20 ,0.05 * DT * 60));}
      }
      if (true) {
        {const p=ipos(R.Body, "LeftA"); R.LeftArm.x=p[0]; R.LeftArm.y=p[1];}
        {const S=R.LeftArm; S.x=C.Side < 0? S.x +8 : S.x;}
        {const S=R.LeftArm; S.a=norm(anglelerp(S.a, R.Body.a + C.Side * 300 ,0.05 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftArm, 1); R.LeftHand.x=p[0]; R.LeftHand.y=p[1];}
          {const S=R.LeftHand; S.a=norm(R.LeftArm.a  - C.Side * 20);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightA"); R.RightArm.x=p[0]; R.RightArm.y=p[1];}
        {const S=R.RightArm; S.x=C.Side < 0? S.x -8 : S.x;}
        {const S=R.RightArm; S.a=norm(anglelerp(S.a, R.Body.a + C.Side * 280 ,0.1 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightArm, 1); R.RightHand.x=p[0]; R.RightHand.y=p[1];}
          {const S=R.RightHand; S.a=norm(R.RightArm.a - C.Side * 20);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "LeftL"); R.LeftLeg.x=p[0]; R.LeftLeg.y=p[1];}
        {const S=R.LeftLeg; S.a=norm(anglelerp(S.a, R.Body.a + C.Side * 300 ,0.05 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftLeg, 1); R.LeftFoot.x=p[0]; R.LeftFoot.y=p[1];}
          {const S=R.LeftFoot; S.a=norm(R.LeftLeg.a + C.Side * 30);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightL"); R.RightLeg.x=p[0]; R.RightLeg.y=p[1];}
        {const S=R.RightLeg; S.a=norm(anglelerp(S.a, R.Body.a + C.Side * 280 ,0.1 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightLeg, 1); R.RightFoot.x=p[0]; R.RightFoot.y=p[1];}
          {const S=R.RightFoot; S.a=norm(R.RightLeg.a + C.Side * 20);}
        }
      }
    }
    else if ((C.State == "wallslide")) {
      {const S=R.Body; const _x=C.ipx(2), _y=C.ipy(2); S.x=_x; S.y=_y;}
      {const S=R.Body; S.a=norm(anglelerp(S.a,-C.Side * 10 + C.Angle,0.05 * DT * 60));}
      if (true) {
        {const p=ipos(R.Body, "Head"); R.Head.x=p[0]; R.Head.y=p[1];}
        {const S=R.Head; S.a=norm(anglelerp(S.a, -C.Side * 40 ,0.05 * DT * 60));}
      }
      if (true) {
        {const p=ipos(R.Body, "LeftA"); R.LeftArm.x=p[0]; R.LeftArm.y=p[1];}
        {const S=R.LeftArm; S.a=norm(anglelerp(S.a,C.Side * 300 ,0.05 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftArm, 1); R.LeftHand.x=p[0]; R.LeftHand.y=p[1];}
          {const S=R.LeftHand; S.a=norm(R.LeftArm.a  - C.Side * 20);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightA"); R.RightArm.x=p[0]; R.RightArm.y=p[1];}
        {const S=R.RightArm; S.a=norm(anglelerp(S.a,C.Side * 280 ,0.1 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightArm, 1); R.RightHand.x=p[0]; R.RightHand.y=p[1];}
          {const S=R.RightHand; S.a=norm(R.RightArm.a - C.Side * 20);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "LeftL"); R.LeftLeg.x=p[0]; R.LeftLeg.y=p[1];}
        {const S=R.LeftLeg; S.a=norm(anglelerp(S.a,C.Side * 300 ,0.05 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftLeg, 1); R.LeftFoot.x=p[0]; R.LeftFoot.y=p[1];}
          {const S=R.LeftFoot; S.a=norm(R.LeftLeg.a + C.Side * 30);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightL"); R.RightLeg.x=p[0]; R.RightLeg.y=p[1];}
        {const S=R.RightLeg; S.a=norm(anglelerp(S.a,C.Side * 280 ,0.1 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightLeg, 1); R.RightFoot.x=p[0]; R.RightFoot.y=p[1];}
          {const S=R.RightFoot; S.a=norm(R.RightLeg.a + C.Side * 20);}
        }
      }
    }
    else if ((C.State == "slide")) {
      {const S=R.Body; const _x=lerp(S.x, C.ipx(2), 0.5), _y=lerp(S.y, C.ipy(2), 0.5); S.x=_x; S.y=_y;}
      {const S=R.Body; S.a=norm(anglelerp(S.a, C.Side * -80 + C.Angle, 0.5 * DT * 60));}
      if (true) {
        {const p=ipos(R.Body, "Head"); R.Head.x=p[0]; R.Head.y=p[1];}
        {const S=R.Head; S.a=norm(R.Body.a + C.Side * (5 * dcos(T * 60 * 10) + 45));}
      }
      if (true) {
        {const p=ipos(R.Body, "LeftA"); R.LeftArm.x=p[0]; R.LeftArm.y=p[1];}
        {const S=R.LeftArm; S.a=norm(anglelerp(S.a,R.Body.a - C.Side*10 -20 ,0.5 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftArm, 1); R.LeftHand.x=p[0]; R.LeftHand.y=p[1];}
          {const S=R.LeftHand; S.a=norm(R.LeftArm.a - C.Side * 40);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightA"); R.RightArm.x=p[0]; R.RightArm.y=p[1];}
        {const S=R.RightArm; S.a=norm(anglelerp(S.a,R.Body.a - C.Side*10 ,0.5 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightArm, 1); R.RightHand.x=p[0]; R.RightHand.y=p[1];}
          {const S=R.RightHand; S.a=norm(R.RightArm.a - C.Side * 40 +10);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "LeftL"); R.LeftLeg.x=p[0]; R.LeftLeg.y=p[1];}
        {const S=R.LeftLeg; S.y=C.Side < 0? S.y +4 : S.y;}
        {const S=R.LeftLeg; S.a=norm(anglelerp(S.a, R.Body.a + C.Side * -20 ,0.5 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftLeg, 1); R.LeftFoot.x=p[0]; R.LeftFoot.y=p[1];}
          {const S=R.LeftFoot; S.a=norm(anglelerp(S.a,R.LeftLeg.a,0.5 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightL"); R.RightLeg.x=p[0]; R.RightLeg.y=p[1];}
        {const S=R.RightLeg; S.y=C.Side < 0? S.y +4 : S.y;}
        {const S=R.RightLeg; S.a=norm(anglelerp(S.a, R.Body.a + C.Side * -45,0.5 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightLeg, 1); R.RightFoot.x=p[0]; R.RightFoot.y=p[1];}
          {const S=R.RightFoot; S.a=norm(anglelerp(S.a,R.LeftLeg.a,0.5 * DT * 60));}
        }
      }
    }
    else if ((C.State == "plunge")) {
      {const S=R.Body; const _x=lerp(S.x, C.ipx(2), 0.5), _y=lerp(S.y, C.ipy(2), 0.5); S.x=_x; S.y=_y;}
      {const S=R.Body; S.a=norm(anglelerp(S.a - C.Angle, C.Side * 120, 0.05 * DT * 60)  + C.Angle);}
      if (true) {
        {const p=ipos(R.Body, "Head"); R.Head.x=p[0]; R.Head.y=p[1];}
        {const S=R.Head; S.a=norm(anglelerp(S.a,R.Body.a - C.Side * (5 * dcos(T * 60 * 10) + 50),0.3));}
      }
      if (true) {
        {const p=ipos(R.Body, "LeftA"); R.LeftArm.x=p[0]; R.LeftArm.y=p[1];}
        {const S=R.LeftArm; S.a=norm(anglelerp(S.a,-R.Body.a - C.Side*10 ,0.5 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftArm, 1); R.LeftHand.x=p[0]; R.LeftHand.y=p[1];}
          {const S=R.LeftHand; S.a=norm(R.LeftArm.a - C.Side * 20);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightA"); R.RightArm.x=p[0]; R.RightArm.y=p[1];}
        {const S=R.RightArm; S.a=norm(anglelerp(S.a,-R.Body.a - C.Side*10 ,0.5 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightArm, 1); R.RightHand.x=p[0]; R.RightHand.y=p[1];}
          {const S=R.RightHand; S.a=norm(R.RightArm.a - C.Side * 20);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "LeftL"); R.LeftLeg.x=p[0]; R.LeftLeg.y=p[1];}
        {const S=R.LeftLeg; S.y=C.Side < 0? S.y -4 : S.y;}
        {const S=R.LeftLeg; S.a=norm(anglelerp(S.a,C.Side * 90,0.1 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftLeg, 1); R.LeftFoot.x=p[0]; R.LeftFoot.y=p[1];}
          {const S=R.LeftFoot; S.a=norm(anglelerp(S.a,R.LeftLeg.a+ C.Side * 30, 0.5 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightL"); R.RightLeg.x=p[0]; R.RightLeg.y=p[1];}
        {const S=R.RightLeg; S.y=C.Side < 0? S.y -4 : S.y;}
        {const S=R.RightLeg; S.a=norm(anglelerp(S.a,C.Side * 90,0.1 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightLeg, 1); R.RightFoot.x=p[0]; R.RightFoot.y=p[1];}
          {const S=R.RightFoot; S.a=norm(anglelerp(S.a,R.RightLeg.a + C.Side * 30,0.5 * DT * 60));}
        }
      }
    }
    else if ((C.State == "slip")) {
      {const S=R.Body; const _x=lerp(S.x, C.ipx(2), 0.5), _y=lerp(S.y, C.ipy(2), 0.5); S.x=_x; S.y=_y;}
      {const S=R.Body; S.a=norm(anglelerp(S.a, C.Side * 120 + C.Angle, 0.05 * DT * 60));}
      if (true) {
        {const p=ipos(R.Body, "Head"); R.Head.x=p[0]; R.Head.y=p[1];}
        {const S=R.Head; S.a=norm(anglelerp(S.a,R.Body.a - C.Side * (5 * dcos(T * 60 * 10) + 50),0.3));}
      }
      if (true) {
        {const p=ipos(R.Body, "LeftA"); R.LeftArm.x=p[0]; R.LeftArm.y=p[1];}
        {const S=R.LeftArm; S.a=norm(anglelerp(S.a,-R.Body.a - C.Side*10 ,0.5 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftArm, 1); R.LeftHand.x=p[0]; R.LeftHand.y=p[1];}
          {const S=R.LeftHand; S.a=norm(R.LeftArm.a - C.Side * 20);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightA"); R.RightArm.x=p[0]; R.RightArm.y=p[1];}
        {const S=R.RightArm; S.a=norm(anglelerp(S.a,-R.Body.a - C.Side*10 ,0.5 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightArm, 1); R.RightHand.x=p[0]; R.RightHand.y=p[1];}
          {const S=R.RightHand; S.a=norm(R.RightArm.a - C.Side * 20);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "LeftL"); R.LeftLeg.x=p[0]; R.LeftLeg.y=p[1];}
        {const S=R.LeftLeg; S.y=C.Side < 0? S.y -4 : S.y;}
        {const S=R.LeftLeg; S.a=norm(anglelerp(S.a, -90 + R.Body.a + C.Side * 120,0.1 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftLeg, 1); R.LeftFoot.x=p[0]; R.LeftFoot.y=p[1];}
          {const S=R.LeftFoot; S.a=norm(anglelerp(S.a,R.LeftLeg.a+ C.Side * 30, 0.5 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightL"); R.RightLeg.x=p[0]; R.RightLeg.y=p[1];}
        {const S=R.RightLeg; S.y=C.Side < 0? S.y -4 : S.y;}
        {const S=R.RightLeg; S.a=norm(anglelerp(S.a, -90 + R.Body.a + C.Side * 120,0.1 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightLeg, 1); R.RightFoot.x=p[0]; R.RightFoot.y=p[1];}
          {const S=R.RightFoot; S.a=norm(anglelerp(S.a,R.RightLeg.a + C.Side * 30,0.5 * DT * 60));}
        }
      }
    }
    else if ((C.State == "pound")) {
      {const S=R.Body; const _x=C.ipx(2), _y=C.ipy(2); S.x=_x; S.y=_y;}
      {const S=R.Body; S.a=norm(anglelerp(S.a, C.Angle, 0.2 * DT * 60));}
      if (true) {
        {const p=ipos(R.Body, "Head"); R.Head.x=p[0]; R.Head.y=p[1];}
        {const S=R.Head; S.a=norm(anglelerp(S.a,R.Body.a,0.2 * DT * 60));}
      }
      if (true) {
        {const p=ipos(R.Body, "LeftA"); R.LeftArm.x=p[0]; R.LeftArm.y=p[1];}
        {const S=R.LeftArm; S.x=C.Side < 0? S.x +8 : S.x;}
        {const S=R.LeftArm; S.a=norm(anglelerp(S.a, C.Side*(150 + R.Body.a),0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftArm, 1); R.LeftHand.x=p[0]; R.LeftHand.y=p[1];}
          {const S=R.LeftHand; S.a=norm(anglelerp(S.a,R.LeftArm.a,0.2 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightA"); R.RightArm.x=p[0]; R.RightArm.y=p[1];}
        {const S=R.RightArm; S.x=C.Side < 0? S.x -8 : S.x;}
        {const S=R.RightArm; S.a=norm(anglelerp(S.a, -C.Side*(150 + C.Angle),0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightArm, 1); R.RightHand.x=p[0]; R.RightHand.y=p[1];}
          {const S=R.RightHand; S.a=norm(anglelerp(S.a,R.RightArm.a,0.2 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "LeftL"); R.LeftLeg.x=p[0]; R.LeftLeg.y=p[1];}
        {const S=R.LeftLeg; S.x=C.Side < 0? S.x +4 : S.x;}
        {const S=R.LeftLeg; S.a=norm(anglelerp(S.a, R.Body.a,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftLeg, 1); R.LeftFoot.x=p[0]; R.LeftFoot.y=p[1];}
          {const S=R.LeftFoot; S.a=norm(anglelerp(S.a,R.LeftLeg.a,0.2 * DT * 60));}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightL"); R.RightLeg.x=p[0]; R.RightLeg.y=p[1];}
        {const S=R.RightLeg; S.x=C.Side < 0? S.x +4 : S.x;}
        {const S=R.RightLeg; S.a=norm(anglelerp(S.a, R.Body.a,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightLeg, 1); R.RightFoot.x=p[0]; R.RightFoot.y=p[1];}
          {const S=R.RightFoot; S.a=norm(anglelerp(S.a,R.RightLeg.a,0.2 * DT * 60));}
        }
      }
    }
    else if ((C.State == "stun")) {
      {const S=R.Body; const _x=lerp(S.x, C.X - dsin(C.Angle) * (C.Height/2 - S.h/2 - 2), 0.5), _y=lerp(S.y, C.Y + dcos(C.Angle) * (C.Height/2 - S.h/2 - 2), 0.5); S.x=_x; S.y=_y;}
      {const S=R.Body; S.a=norm(anglelerp(S.a,C.Side * 40 + C.Angle ,0.1 * DT * 60));}
      if (true) {
        {const p=ipos(R.Body, "Head"); R.Head.x=p[0]; R.Head.y=p[1];}
        {const S=R.Head; S.a=norm(anglelerp(S.a, R.Body.a ,0.5) + dsin(T * 60 *30)*5);}
      }
      if (true) {
        {const p=ipos(R.Body, "LeftA"); R.LeftArm.x=p[0]; R.LeftArm.y=p[1];}
        {const S=R.LeftArm; S.a=norm(anglelerp(S.a, R.Body.a - C.Side * 25 ,0.1 * DT * 60));}
        if (true) {
          {const p=ipos(R.LeftArm, 1); R.LeftHand.x=p[0]; R.LeftHand.y=p[1];}
          {const S=R.LeftHand; S.a=norm(R.LeftArm.a + C.Side * 20);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightA"); R.RightArm.x=p[0]; R.RightArm.y=p[1];}
        {const S=R.RightArm; S.a=norm(anglelerp(S.a, R.Body.a - C.Side * 25 ,0.1 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightArm, 1); R.RightHand.x=p[0]; R.RightHand.y=p[1];}
          {const S=R.RightHand; S.a=norm(R.RightArm.a + C.Side * 20);}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "LeftL"); R.LeftLeg.x=p[0]; R.LeftLeg.y=p[1];}
        {const S=R.LeftLeg; S.a=norm(anglelerp(S.a, R.Body.a + C.Side * 45 ,0.2 * DT * 60));}
        {R.LeftLeg.mir = 1==0 ? -1 : 1;}
        if (true) {
          {const p=ipos(R.LeftLeg, 1); R.LeftFoot.x=p[0]; R.LeftFoot.y=p[1];}
          {const S=R.LeftFoot; S.a=norm(anglelerp(S.a, R.LeftLeg.a, 0.5 * DT * 60));}
          {R.LeftFoot.mir = 1==0 ? -1 : 1;}
        }
      }
      if (true) {
        {const p=ipos(R.Body, "RightL"); R.RightLeg.x=p[0]; R.RightLeg.y=p[1];}
        {const S=R.RightLeg; S.a=norm(anglelerp(S.a, R.Body.a + C.Side * 90 ,0.2 * DT * 60));}
        if (true) {
          {const p=ipos(R.RightLeg, 1); R.RightFoot.x=p[0]; R.RightFoot.y=p[1];}
          {const S=R.RightFoot; S.a=norm(anglelerp(S.a, R.RightLeg.a - C.Side * 45, 0.5 * DT * 60));}
        }
      }
    }
  }
  if ((C.Skin == "amongus")) {
    if (true || true) {
      if (true) {
        {const S=R.Body; S.h=lerp(S.h, S.ih, 0.2 * DT * 60);}
      }
      if (C.jumped) {
        {const S=R.Body; S.h=S.ih*2;}
      }
      if (C.landed) {
        {const S=R.Body; S.h=S.ih*0.6;}
      }
    }
  }
};
