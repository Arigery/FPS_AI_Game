export class DebugHUD {
  el=document.createElement('pre'); state=document.createElement('div');
  constructor(){this.el.id='debug';document.body.append(this.el);this.state.id='status';document.body.append(this.state);}
  update(text:string,status:string){this.el.textContent=text;this.state.textContent=status;}
}
