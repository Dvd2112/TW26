/**
 * Único ajuste sobre o CRA: o build ESM do html5-qrcode publica comentários
 * `//# sourceMappingURL=...ts` apontando para os .ts originais, que não vão no
 * pacote npm. O source-map-loader do CRA (regra `enforce: 'pre'` em
 * react-scripts/config/webpack.config.js) tenta buscar esses arquivos e falha
 * com "Failed to parse source map" — inofensivo (não quebra build, lint nem o
 * funcionamento do scanner), mas polui o terminal do start/build. Excluímos só
 * essa dependência do loader; o resto do comportamento do CRA fica intacto.
 */
module.exports = {
  webpack: {
    configure: (config) => {
      const sourceMapRule = config.module.rules.find(
        (rule) => rule && rule.enforce === 'pre' && String(rule.loader ?? '').includes('source-map-loader'),
      );
      if (sourceMapRule) {
        const existing = Array.isArray(sourceMapRule.exclude) ? sourceMapRule.exclude : [sourceMapRule.exclude];
        sourceMapRule.exclude = [...existing.filter(Boolean), /node_modules[\\/]html5-qrcode/];
      }
      return config;
    },
  },
};
