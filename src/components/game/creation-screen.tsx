"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { weapons, type Character, type WeaponType } from "@/lib/character";

export function CharacterCreation({ onCreate, pending, error }: {
  onCreate: (character: Character) => void; pending: boolean; error?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(960);
  const [name, setName] = useState("");
  const [weapon, setWeapon] = useState<WeaponType | null>(null);
  const [validation, setValidation] = useState("");
  const [focus, setFocus] = useState("");
  const cols = width < 600 ? 2 : width < 900 ? 4 : 6;
  const area = Math.min(width - 32, 1100);
  const left = (width - area) / 2;
  const cell = (area - (cols - 1) * 12) / cols;
  const footer = 260 + Math.ceil(weapons.length / cols) * 110;
  const height = footer + 170;
  const message = validation || error;

  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    if (!element || !ctx) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    element.width = Math.round(width * ratio); element.height = Math.round(height * ratio);
    ctx.scale(ratio, ratio);
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#102e29"); sky.addColorStop(1, "#45654b");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#dbe4ad"; ctx.beginPath(); ctx.arc(width - 80, 68, 30, 0, Math.PI * 2); ctx.fill();
    function text(value: string, x: number, y: number, font = "14px system-ui", color = "#edf2df") {
      ctx!.font = font; ctx!.fillStyle = color; ctx!.fillText(value, x, y);
    }
    function box(x: number, y: number, w: number, h: number, fill: string, border: string) {
      ctx!.beginPath(); ctx!.roundRect(x, y, w, h, 10); ctx!.fillStyle = fill; ctx!.fill();
      ctx!.strokeStyle = border; ctx!.lineWidth = 2; ctx!.stroke();
    }
    text("IDLEON", left, 36, "600 12px system-ui", "#c3d49e");
    text("Create your character", left, 96, `600 ${width < 600 ? 26 : 36}px system-ui`);
    text("Choose your name and starting weapon.", left, 125);
    text("CHARACTER NAME", left, 155, "600 11px system-ui", "#c3d49e");
    box(left, 168, Math.min(area, 400), 48, "#122d28", focus === "name" ? "#e4d895" : "#607c63");
    text("CHOOSE YOUR WEAPON", left, 245, "600 11px system-ui", "#c3d49e");
    weapons.forEach((option, i) => {
      const x = left + i % cols * (cell + 12), y = 260 + Math.floor(i / cols) * 110;
      box(x, y, cell, 98, weapon === option.id ? "#536b43" : "#16392f", focus === option.id ? "#fff" : weapon === option.id ? "#e4d895" : "#54715b");
      ctx.save(); ctx.translate(x + cell / 2 - 20, y + 8); ctx.scale(0.65, 0.65);
      ctx.strokeStyle = "#dbe4ad"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.stroke(new Path2D(option.path)); ctx.restore();
      ctx.textAlign = "center"; text(option.label, x + cell / 2, y + 76, "500 13px system-ui");
      if (weapon === option.id) text("SELECTED", x + cell / 2, y + 91, "600 9px system-ui", "#fff0b8");
      ctx.textAlign = "left";
    });
    const buttonWidth = Math.min(area, 280);
    box((width - buttonWidth) / 2, footer + 18, buttonWidth, 52, "#e4d895", focus === "submit" ? "#fff" : "#f3e7b2");
    ctx.textAlign = "center";
    text(pending ? "Creating..." : "Create character", width / 2, footer + 51, "600 16px system-ui", "#19392d");
    text("Saved for your next adventure.", width / 2, footer + 94, "12px system-ui");
    ctx.textAlign = "left";
    if (message) {
      let line = "", y = footer + 122;
      ctx.font = "12px system-ui";
      for (const word of message.split(" ")) {
        if (line && ctx.measureText(`${line} ${word}`).width > area) { text(line, left, y, "12px system-ui", "#ffcebb"); line = word; y += 16; }
        else line = line ? `${line} ${word}` : word;
      }
      text(line, left, y, "12px system-ui", "#ffcebb");
    }
  }, [width, height, left, area, cell, cols, footer, weapon, focus, pending, message]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^[\p{L}\p{N}][\p{L}\p{N} '-]{1,23}$/u.test(name.trim())) { setValidation("Use 2-24 letters, numbers, spaces, apostrophes, or hyphens. Start with a letter or number."); return; }
    if (!weapon) { setValidation("Choose your weapon."); return; }
    setValidation(""); onCreate({ name: name.trim(), weapon });
  }

  return <div ref={host} className="flex h-full w-full items-start overflow-auto bg-[#102e29]">
    <div className="relative my-auto w-full shrink-0" style={{ height }}>
      <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      <form onSubmit={submit} aria-label="Create your character" aria-busy={pending} className="absolute inset-0">
        <fieldset disabled={pending}>
          <legend className="sr-only">Choose a name and weapon</legend>
          <label htmlFor="character-name" className="sr-only">Character name, 2 to 24 characters</label>
          <input id="character-name" value={name} onChange={(event) => setName(event.target.value)} onFocus={() => setFocus("name")} onBlur={() => setFocus("")} placeholder="Your name" required minLength={2} maxLength={24} autoComplete="off" className="absolute rounded-xl bg-transparent px-4 text-base text-[#edf2df] outline-none placeholder:text-[#99ae98]" style={{ left, top: 168, width: Math.min(area, 400), height: 48 }} />
          {weapons.map((option, i) => <label key={option.id} className="absolute cursor-pointer rounded-xl" style={{ left: left + i % cols * (cell + 12), top: 260 + Math.floor(i / cols) * 110, width: cell, height: 98 }}>
            <input type="radio" name="weapon" value={option.id} checked={weapon === option.id} onChange={() => setWeapon(option.id)} onFocus={() => setFocus(option.id)} onBlur={() => setFocus("")} required className="sr-only" /><span className="sr-only">{option.label}</span>
          </label>)}
          <button type="submit" disabled={pending} onFocus={() => setFocus("submit")} onBlur={() => setFocus("")} className="absolute cursor-pointer rounded-xl outline-none disabled:cursor-wait" style={{ left: (width - Math.min(area, 280)) / 2, top: footer + 18, width: Math.min(area, 280), height: 52 }}><span className="sr-only">{pending ? "Creating character" : "Create character"}</span></button>
        </fieldset>
        {message && <p role="alert" className="sr-only">{message}</p>}
      </form>
    </div>
  </div>;
}
