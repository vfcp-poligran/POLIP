import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'capitalize',
    standalone: true
})
export class CapitalizePipe implements PipeTransform {
    transform(value: string | null | undefined): string {
        if (!value) return '';

        // Convertir a minúsculas y luego capitalizar primera letra
        const lowercased = value.toLowerCase();
        return lowercased.charAt(0).toUpperCase() + lowercased.slice(1);
    }
}
