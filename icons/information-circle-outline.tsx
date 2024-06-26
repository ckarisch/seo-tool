export const InformationCircleOutline = (params: { width?: number, height?: number } = { width: 32, height: 32 }) => {
  const w = params.width ? params.width : 32;
  const h = params.height ? params.height : params.width;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={w} height={h} viewBox="0 0 512 512"><path d="M248,64C146.39,64,64,146.39,64,248s82.39,184,184,184,184-82.39,184-184S349.61,64,248,64Z"  style={{ fill: 'none', stroke: '#000', strokeLinecap: 'round', strokeMiterlimit: 10, strokeWidth: 32 }}/><polyline points="220 220 252 220 252 336"  style={{ fill: 'none', stroke: '#000', strokeLinecap: 'round', strokeMiterlimit: 10, strokeWidth: 32 }} /><line x1="208" y1="340" x2="296" y2="340" style={{ fill: 'none', stroke: '#000', strokeLinecap: 'round', strokeMiterlimit: 10, strokeWidth: 32 }} /><path d="M248,130a26,26,0,1,0,26,26A26,26,0,0,0,248,130Z" /></svg>)
};