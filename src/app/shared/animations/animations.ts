// ============================================
// ANGULAR ANIMATIONS
// ============================================
// Programmatic animations using @angular/animations
// Complements SCSS animations in _animations.scss

import {
    trigger,
    state,
    style,
    transition,
    animate,
    query,
    stagger,
    animateChild,
    group,
    sequence,
} from '@angular/animations';

// ============================================
// PAGE TRANSITIONS
// ============================================

/**
 * Page enter animation with slide-up effect
 * Usage: Add to @Component({ animations: [pageEnterAnimation] })
 */
export const pageEnterAnimation = trigger('pageEnter', [
    transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate(
            '400ms cubic-bezier(0.4, 0, 0.2, 1)',
            style({ opacity: 1, transform: 'translateY(0)' })
        ),
    ]),
]);

/**
 * Page transition for route changes
 * Usage: [@routeAnimation]="prepareRoute(outlet)"
 */
export const routeAnimation = trigger('routeAnimation', [
    transition('* <=> *', [
        style({ position: 'relative' }),
        query(
            ':enter, :leave',
            [
                style({
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    opacity: 0,
                }),
            ],
            { optional: true }
        ),
        query(':enter', [style({ opacity: 0 })], { optional: true }),
        sequence([
            query(
                ':leave',
                [animate('200ms ease-out', style({ opacity: 0 }))],
                { optional: true }
            ),
            query(
                ':enter',
                [
                    style({ transform: 'translateY(20px)' }),
                    animate(
                        '400ms cubic-bezier(0.4, 0, 0.2, 1)',
                        style({ opacity: 1, transform: 'translateY(0)' })
                    ),
                ],
                { optional: true }
            ),
        ]),
    ]),
]);

// ============================================
// LIST ANIMATIONS (STAGGER)
// ============================================

/**
 * Staggered list item animation
 * Usage: 
 * <div [@listAnimation]="items.length">
 *   <div *ngFor="let item of items" @itemAnimation>...</div>
 * </div>
 */
export const listAnimation = trigger('listAnimation', [
    transition('* => *', [
        query(
            ':enter',
            [
                style({ opacity: 0, transform: 'translateY(10px)' }),
                stagger('50ms', [
                    animate(
                        '300ms cubic-bezier(0.4, 0, 0.2, 1)',
                        style({ opacity: 1, transform: 'translateY(0)' })
                    ),
                ]),
            ],
            { optional: true }
        ),
    ]),
]);

/**
 * Individual item animation (used with listAnimation)
 */
export const itemAnimation = trigger('itemAnimation', [
    transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate(
            '200ms ease-out',
            style({ opacity: 1, transform: 'scale(1)' })
        ),
    ]),
    transition(':leave', [
        animate(
            '200ms ease-in',
            style({ opacity: 0, transform: 'scale(0.95)' })
        ),
    ]),
]);

// ============================================
// MODAL ANIMATIONS
// ============================================

/**
 * Modal backdrop fade animation
 */
export const backdropAnimation = trigger('backdropAnimation', [
    transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 })),
    ]),
    transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 })),
    ]),
]);

/**
 * Modal dialog scale animation
 */
export const modalAnimation = trigger('modalAnimation', [
    transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate(
            '250ms cubic-bezier(0.4, 0, 0.2, 1)',
            style({ opacity: 1, transform: 'scale(1)' })
        ),
    ]),
    transition(':leave', [
        animate(
            '200ms cubic-bezier(0.4, 0, 1, 1)',
            style({ opacity: 0, transform: 'scale(0.95)' })
        ),
    ]),
]);

// ============================================
// TAB/SEGMENT TRANSITIONS
// ============================================

/**
 * Fade transition for tab content changes
 */
export const tabFadeAnimation = trigger('tabFade', [
    transition('* => *', [
        query(
            ':enter',
            [
                style({ opacity: 0, position: 'absolute' }),
                animate('250ms ease-in-out', style({ opacity: 1 })),
            ],
            { optional: true }
        ),
        query(
            ':leave',
            [animate('150ms ease-in-out', style({ opacity: 0 }))],
            { optional: true }
        ),
    ]),
]);

/**
 * Slide transition for tab content (left/right)
 */
export const tabSlideAnimation = trigger('tabSlide', [
    transition(':increment', [
        query(
            ':enter, :leave',
            [
                style({
                    position: 'absolute',
                    width: '100%',
                }),
            ],
            { optional: true }
        ),
        group([
            query(
                ':enter',
                [
                    style({ transform: 'translateX(100%)' }),
                    animate(
                        '300ms cubic-bezier(0.4, 0, 0.2, 1)',
                        style({ transform: 'translateX(0)' })
                    ),
                ],
                { optional: true }
            ),
            query(
                ':leave',
                [
                    animate(
                        '300ms cubic-bezier(0.4, 0, 0.2, 1)',
                        style({ transform: 'translateX(-100%)' })
                    ),
                ],
                { optional: true }
            ),
        ]),
    ]),
    transition(':decrement', [
        query(
            ':enter, :leave',
            [
                style({
                    position: 'absolute',
                    width: '100%',
                }),
            ],
            { optional: true }
        ),
        group([
            query(
                ':enter',
                [
                    style({ transform: 'translateX(-100%)' }),
                    animate(
                        '300ms cubic-bezier(0.4, 0, 0.2, 1)',
                        style({ transform: 'translateX(0)' })
                    ),
                ],
                { optional: true }
            ),
            query(
                ':leave',
                [
                    animate(
                        '300ms cubic-bezier(0.4, 0, 0.2, 1)',
                        style({ transform: 'translateX(100%)' })
                    ),
                ],
                { optional: true }
            ),
        ]),
    ]),
]);

// ============================================
// SKELETON LOADER ANIMATION
// ============================================

/**
 * Pulse animation for skeleton loaders
 */
export const skeletonPulse = trigger('skeletonPulse', [
    state('loading', style({ opacity: 1 })),
    state('loaded', style({ opacity: 0 })),
    transition('loading => loaded', [
        animate('300ms ease-out', style({ opacity: 0 })),
    ]),
]);

// ============================================
// MICRO-INTERACTIONS
// ============================================

/**
 * Button press animation
 */
export const buttonPress = trigger('buttonPress', [
    transition('* => pressed', [
        animate('100ms ease-in', style({ transform: 'scale(0.95)' })),
    ]),
    transition('pressed => *', [
        animate('100ms ease-out', style({ transform: 'scale(1)' })),
    ]),
]);

/**
 * Bounce attention animation
 */
export const bounceAttention = trigger('bounceAttention', [
    transition('* => bounce', [
        sequence([
            animate('200ms ease-out', style({ transform: 'translateY(-8px)' })),
            animate('200ms ease-in', style({ transform: 'translateY(0)' })),
        ]),
    ]),
]);

// ============================================
// EXPANDABLE/COLLAPSIBLE
// ============================================

/**
 * Expand/collapse animation for accordions
 */
export const expandCollapse = trigger('expandCollapse', [
    state('collapsed', style({ height: '0', overflow: 'hidden', opacity: 0 })),
    state('expanded', style({ height: '*', overflow: 'visible', opacity: 1 })),
    transition('collapsed <=> expanded', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)'),
    ]),
]);

// ============================================
// UTILITY FUNCTION
// ============================================

/**
 * Helper function to prepare route animations
 * Usage in component:
 * prepareRoute(outlet: RouterOutlet) {
 *   return outlet?.activatedRouteData?.['animation'];
 * }
 */
export function prepareRoute(outlet: any) {
    return outlet?.activatedRouteData?.['animation'];
}
