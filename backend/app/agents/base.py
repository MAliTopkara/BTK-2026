from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from app.models.scan import LayerResult, ProductData

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    layer_id: str
    name: str

    @abstractmethod
    async def analyze(self, product: ProductData) -> LayerResult:
        ...

    async def safe_analyze(self, product: ProductData) -> LayerResult:
        # TASK-08: Hata durumunda katman INFO olarak döner, skor null
        try:
            return await self.analyze(product)
        except Exception as exc:
            logger.error("[%s] analiz hatası: %s", self.layer_id, exc)
            return LayerResult(
                layer_id=self.layer_id,
                name=self.name,
                status="INFO",
                score=None,
                finding="Analiz tamamlanamadı",
                details={"error": str(exc)},
                confidence=0.0,
            )
