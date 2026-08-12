const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

export function IconGrid(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...common} {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconInbox(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...common} {...props}>
      <path d="M3.5 13.5 6 5.5h12l2.5 8" />
      <path d="M3.5 13.5h5l1 2.5h5l1-2.5h5v5a1.5 1.5 0 0 1-1.5 1.5h-16A1.5 1.5 0 0 1 3.5 18.5v-5Z" />
    </svg>
  );
}

export function IconBriefcase(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...common} {...props}>
      <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
      <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
      <path d="M3.5 12.5h17" />
    </svg>
  );
}

export function IconFileText(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...common} {...props}>
      <path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5v4h4" />
      <path d="M8.5 13h7M8.5 16.5h7" />
    </svg>
  );
}

export function IconDownload(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...common} {...props}>
      <path d="M12 3.5v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M4.5 17.5v2a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-2" />
    </svg>
  );
}

export function IconUsers(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...common} {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.8-3 3-4.5 5.5-4.5S13.7 16 14.5 19" />
      <path d="M15.5 5.2a3 3 0 0 1 0 5.6" />
      <path d="M17 14.6c2 .4 3.4 1.8 4 4.4" />
    </svg>
  );
}

export function IconBell(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...common} {...props}>
      <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function IconLogout(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...common} {...props}>
      <path d="M9 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h3" />
      <path d="M14.5 15.5 19 11l-4.5-4.5" />
      <path d="M19 11H9" />
    </svg>
  );
}

export function IconTrendingUp(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...common} {...props}>
      <path d="m4 15 5.5-5.5 4 4L20 6.5" />
      <path d="M14.5 6.5H20V12" />
    </svg>
  );
}

export function IconCalendar(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...common} {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconChevronRight(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...common} {...props}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function IconClock(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...common} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function IconTrash(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...common} {...props}>
      <path d="M4.5 7h15" />
      <path d="M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" />
      <path d="M6.5 7l.8 12.5a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconEdit(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...common} {...props}>
      <path d="M4 20h4l10.5-10.5a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5V20Z" />
      <path d="M13.5 7 17 10.5" />
    </svg>
  );
}

export function IconX(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...common} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
