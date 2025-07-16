# Button Component

A comprehensive, reusable button component that supports multiple variants, sizes, and states. This component consolidates all button patterns used throughout the application.

## Features

- **Multiple Variants**: Primary, secondary, outline, ghost, flat, danger, success, warning, and icon
- **Multiple Sizes**: xs, sm, md, lg, xl
- **Icon Support**: Start icons, end icons, and icon-only buttons
- **States**: Loading, disabled, and normal states
- **Link Support**: Can render as anchor tags for navigation
- **Full Width**: Option for full-width buttons
- **TypeScript**: Fully typed with proper interfaces

## Usage

### Basic Import

```tsx
import Button from '@/components/form/button/Button';
```

### Basic Examples

```tsx
// Primary button
<Button variant="primary">Click me</Button>

// Button with icon
<Button variant="primary" startIcon={<Plus className="h-4 w-4" />}>
  Add Item
</Button>

// Icon-only button
<Button variant="icon" startIcon={<Edit className="h-4 w-4" />} />

// Link button
<Button href="/dashboard" variant="primary">
  Go to Dashboard
</Button>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Button content (optional for icon-only buttons) |
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'flat' \| 'danger' \| 'success' \| 'warning' \| 'icon'` | `'primary'` | Button style variant |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Button size |
| `startIcon` | `ReactNode` | - | Icon before the text |
| `endIcon` | `ReactNode` | - | Icon after the text |
| `onClick` | `() => void` | - | Click handler |
| `disabled` | `boolean` | `false` | Disabled state |
| `loading` | `boolean` | `false` | Loading state with spinner |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Button type |
| `fullWidth` | `boolean` | `false` | Full width button |
| `href` | `string` | - | Renders as anchor tag if provided |
| `target` | `string` | - | Target for external links |
| `className` | `string` | - | Additional CSS classes |

## Variants

### Primary
```tsx
<Button variant="primary">Primary Button</Button>
```
- Brand red background
- White text
- Hover scale effect
- Used for main actions

### Secondary
```tsx
<Button variant="secondary">Secondary Button</Button>
```
- Blue background
- Used for secondary actions

### Outline
```tsx
<Button variant="outline">Outline Button</Button>
```
- Transparent background with border
- Hover effects with brand colors

### Ghost
```tsx
<Button variant="ghost">Ghost Button</Button>
```
- Transparent background
- Subtle hover effects

### Flat
```tsx
<Button variant="flat">Flat Button</Button>
```
- Light background with border
- Minimal styling

### Danger
```tsx
<Button variant="danger">Delete</Button>
```
- Red background
- Used for destructive actions

### Success
```tsx
<Button variant="success">Save</Button>
```
- Green background
- Used for positive actions

### Warning
```tsx
<Button variant="warning">Warning</Button>
```
- Yellow background
- Used for cautionary actions

### Icon
```tsx
<Button variant="icon" startIcon={<Edit className="h-4 w-4" />} />
```
- Icon-only button
- No text content needed
- Transparent background

## Sizes

```tsx
<Button size="xs">Extra Small</Button>
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>
```

## Common Patterns

### Form Actions
```tsx
<div className="flex gap-4">
  <Button variant="outline">Cancel</Button>
  <Button variant="primary" type="submit">Save Changes</Button>
</div>
```

### Table Actions
```tsx
<div className="flex gap-2">
  <Button variant="icon" size="sm" startIcon={<Edit className="h-4 w-4" />} />
  <Button variant="icon" size="sm" startIcon={<Trash2 className="h-4 w-4" />} />
  <Button variant="icon" size="sm" startIcon={<Star className="h-4 w-4" />} />
</div>
```

### Loading State
```tsx
<Button variant="primary" loading>
  Loading...
</Button>
```

### Disabled State
```tsx
<Button variant="primary" disabled>
  Disabled Button
</Button>
```

### Link Button
```tsx
<Button href="/dashboard" variant="primary">
  Go to Dashboard
</Button>

<Button href="https://example.com" target="_blank" variant="outline">
  External Link
</Button>
```

### Full Width
```tsx
<Button variant="primary" fullWidth>
  Full Width Button
</Button>
```

## Migration Guide

### Before (Old Pattern)
```tsx
<button className="bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600 transition-colors duration-200">
  Click me
</button>
```

### After (New Component)
```tsx
<Button variant="primary">
  Click me
</Button>
```

### Before (Icon Button)
```tsx
<button className="p-2 text-gray-500 hover:text-brand-500 transition-colors duration-200">
  <Edit className="h-4 w-4" />
</button>
```

### After (New Component)
```tsx
<Button variant="icon" startIcon={<Edit className="h-4 w-4" />} />
```

## Best Practices

1. **Use semantic variants**: Choose the variant that matches the action's intent
2. **Consistent sizing**: Use appropriate sizes for the context
3. **Icon consistency**: Use Lucide React icons with consistent sizing
4. **Loading states**: Always show loading state for async actions
5. **Accessibility**: The component handles keyboard navigation and screen readers

## Accessibility

- Proper ARIA labels for icon-only buttons
- Keyboard navigation support
- Focus management
- Screen reader compatibility
- Loading state announcements 