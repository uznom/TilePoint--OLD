import React from 'react';

// Re-export all HeroUI components from our custom design system
export { HeroButton as Button, HeroButton } from './HeroButton';
export { HeroButtonGroup as ButtonGroup, HeroButtonGroup } from './HeroButtonGroup';

export {
  HeroSwitch as Switch,
  HeroSwitch,
  SwitchGroup,
  Label,
} from './HeroSwitch';

export {
  HeroCheckbox as Checkbox,
  HeroCheckbox,
} from './HeroCheckbox';

export {
  HeroRadio as Radio,
  HeroRadio,
} from './HeroRadio';

export {
  HeroSlider as Slider,
  HeroSlider,
} from './HeroSlider';

export {
  HeroInput as Input,
  HeroInput,
} from './HeroInput';

export {
  HeroTextarea as Textarea,
  HeroTextarea,
} from './HeroTextarea';

export {
  HeroSelect as Select,
  HeroSelect,
  SelectItem,
  SelectSection,
} from './HeroSelect';

export {
  HeroAutocomplete as Autocomplete,
  HeroAutocomplete,
} from './HeroAutocomplete';

export {
  HeroNumberInput as NumberField,
  HeroNumberInput,
} from './HeroNumberInput';

export {
  HeroDatePicker as DatePicker,
  HeroDatePicker,
} from './HeroDatePicker';

export {
  HeroCard as Card,
  HeroCard,
} from './HeroCard';
export const CardHeader = ({ children, className = '', ...props }: any) => (
  <div className={`p-4 border-b border-divider font-bold ${className}`} {...props}>
    {children}
  </div>
);
export const CardBody = ({ children, className = '', ...props }: any) => (
  <div className={`p-4 flex-1 ${className}`} {...props}>
    {children}
  </div>
);
export const CardFooter = ({ children, className = '', ...props }: any) => (
  <div className={`p-4 border-t border-divider bg-default-50/50 ${className}`} {...props}>
    {children}
  </div>
);

export {
  HeroTable as Table,
  HeroTable,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from './HeroTable';

export {
  HeroBadge as Badge,
  HeroBadge,
} from './HeroBadge';

export {
  HeroChip as Chip,
  HeroChip,
} from './HeroChip';

export {
  HeroAvatar as Avatar,
  HeroAvatar,
  AvatarGroup,
} from './HeroAvatar';

export {
  HeroAccordion as Accordion,
  HeroAccordion,
} from './HeroAccordion';
export const AccordionItem = ({ title, subtitle, children, className = '' }: any) => (
  <details className={`group border-b border-divider py-2 ${className}`}>
    <summary className="flex justify-between items-center cursor-pointer list-none font-bold text-sm select-none">
      <div>
        <div>{title}</div>
        {subtitle && <div className="text-xs text-default-400 font-normal">{subtitle}</div>}
      </div>
      <span className="transition group-open:rotate-180 text-default-400">▼</span>
    </summary>
    <div className="pt-2 text-xs text-default-600 leading-relaxed">{children}</div>
  </details>
);

export {
  HeroTabs as Tabs,
  HeroTabs,
  Tab,
} from './HeroTabs';

export {
  HeroPagination as Pagination,
  HeroPagination,
} from './HeroPagination';

export {
  HeroScrollShadow as ScrollShadow,
  HeroScrollShadow,
} from './HeroScrollShadow';

export {
  HeroModal as Modal,
  HeroModal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from './HeroModal';

export {
  HeroDrawer as Drawer,
  HeroDrawer,
} from './HeroDrawer';

export {
  HeroTooltip as Tooltip,
  HeroTooltip,
} from './HeroTooltip';

export {
  HeroPopover as Popover,
  HeroPopover,
} from './HeroPopover';
export const PopoverTrigger = ({ children }: any) => <>{children}</>;
export const PopoverContent = ({ children, className = '' }: any) => (
  <div className={`p-3 bg-content1 rounded-xl shadow-lg border border-divider ${className}`}>{children}</div>
);

export {
  HeroAlert as Alert,
  HeroAlert,
} from './HeroAlert';

export {
  HeroProgress as Progress,
  HeroProgress,
} from './HeroProgress';

export {
  HeroSkeleton as Skeleton,
  HeroSkeleton,
} from './HeroSkeleton';

export {
  HeroSpinner as Spinner,
  HeroSpinner,
} from './HeroSpinner';

export {
  HeroDropdownSelect as Dropdown,
  HeroDropdownSelect,
} from './HeroDropdown';
export const DropdownTrigger = ({ children }: any) => <>{children}</>;
export const DropdownMenu = ({ children, className = '', 'aria-label': ariaLabel }: any) => (
  <div role="menu" aria-label={ariaLabel} className={`flex flex-col gap-1 p-1 bg-content1 rounded-xl shadow-lg border border-divider ${className}`}>
    {children}
  </div>
);
export const DropdownItem = ({ key, children, onClick, className = '', color = 'default' }: any) => (
  <button
    key={key}
    type="button"
    role="menuitem"
    onClick={onClick}
    className={`w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-default-100 transition-colors flex items-center gap-2 ${
      color === 'danger' ? 'text-danger hover:bg-danger-50' : 'text-foreground'
    } ${className}`}
  >
    {children}
  </button>
);
export const DropdownSection = ({ title, children, className = '' }: any) => (
  <div className={`flex flex-col gap-1 py-1 border-b border-divider last:border-b-0 ${className}`}>
    {title && <span className="text-[10px] font-bold uppercase text-default-400 px-3 py-1">{title}</span>}
    {children}
  </div>
);

export {
  HeroNavbar as Navbar,
  HeroNavbar,
} from './HeroNavbar';

export {
  HeroBreadcrumbs as Breadcrumbs,
  HeroBreadcrumbs,
} from './HeroBreadcrumbs';
export const BreadcrumbItem = ({ children, href, isCurrent, className = '' }: any) => (
  <li className={`inline-flex items-center gap-1.5 text-xs ${isCurrent ? 'font-bold text-foreground' : 'text-default-500 hover:text-foreground'} ${className}`}>
    {href ? <a href={href}>{children}</a> : <span>{children}</span>}
  </li>
);

export {
  HeroLink as Link,
  HeroLink,
} from './HeroLink';

export {
  HeroDivider as Divider,
  HeroDivider,
} from './HeroDivider';

export {
  HeroSpacer as Spacer,
  HeroSpacer,
} from './HeroSpacer';

export {
  Form,
  FieldError,
} from './HeroForm';

export {
  Meter,
} from './HeroMeter';

export {
  SearchField,
} from './HeroSearchField';

export {
  ColorPicker,
  ColorArea,
  ColorSlider,
  ColorSwatch,
  ColorField,
  ColorSwatchPicker,
} from './HeroColorPicker';

export {
  AlertDialog,
} from './HeroAlertDialog';

export const HeroUIProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export default {
  Button: './HeroButton',
};
