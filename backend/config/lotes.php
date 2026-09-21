<?php
declare(strict_types=1);

if (!function_exists('loteFinalPrice')):
/**
 * Preço que o usuário efetivamente paga no lote, conforme o tipo dele:
 * staff = gratuito; voluntário = desconto do lote; normal = preço cheio.
 */
function loteFinalPrice(float $price, float $volunteerDiscountPercent, string $participantType): float
{
    if ($participantType === 'staff') {
        return 0.0;
    }
    if ($participantType === 'volunteer') {
        return round($price * (1 - $volunteerDiscountPercent / 100), 2);
    }
    return $price;
}
endif;
