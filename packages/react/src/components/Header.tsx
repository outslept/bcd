interface CompatTableHeaderProps {
  children: React.ReactNode;
}

const CompatTableHeader = ({
  ref,
  children,
  ...props
}: CompatTableHeaderProps & {
  ref?: React.RefObject<HTMLTableSectionElement | null>;
}) => {
  return (
    <thead ref={ref} data-compat-table-header="" {...props}>
      {children}
    </thead>
  );
};

export { CompatTableHeader };
