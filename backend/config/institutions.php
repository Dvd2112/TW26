<?php
declare(strict_types=1);

/** Instituições aceitas no cadastro e nos lotes. 'ensino_medio' exige o nome da escola. */
const ALLOWED_INSTITUTIONS = ['UTFPR', 'CESUL', 'UNIPAR', 'ensino_medio', 'outros'];
const SCHOOL_MAX_LENGTH = 120;

if (!function_exists('normalizeSchool')):
/**
 * Nome da escola já sanitizado: obrigatório para 'ensino_medio'; NULL para as demais
 * instituições (descarta o que vier). Retorna false se faltar ou exceder o limite.
 */
function normalizeSchool(string $institution, mixed $school): string|null|false
{
    if ($institution !== 'ensino_medio') {
        return null;
    }
    $clean = htmlspecialchars(strip_tags(trim((string) $school)), ENT_QUOTES, 'UTF-8');
    $len = mb_strlen($clean, 'UTF-8');
    return ($len < 2 || $len > SCHOOL_MAX_LENGTH) ? false : $clean;
}
endif;
