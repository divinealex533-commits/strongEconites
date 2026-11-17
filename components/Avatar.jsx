"use client";
// A person's photo, or their initial when they haven't added one.
export default function Avatar({ person, size = 40, className = "" }) {
  const name = person?.full_name || "?";
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  if (person?.avatar_url) {
    return <img className={"avatar " + className} src={person.avatar_url} alt="" width={size} height={size} style={style} loading="lazy" />;
  }
  return <span className={"avatar initial " + className} style={style} aria-hidden="true">{name.charAt(0).toUpperCase()}</span>;
}
