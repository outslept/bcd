function CompatTableHeader({
  ref,
  children,
  ...props
}: {
  children: React.ReactNode;
  ref?: React.RefObject<HTMLTableSectionElement | null>;
}) {
  return (
    <thead ref={ref} {...props}>
      {children}
    </thead>
  );
}

export { CompatTableHeader };
