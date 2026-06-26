CREATE TABLE `product_hub_data_engine_link_data_source` (
  `dataEngineUuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dataSourceUuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`dataEngineUuid`,`dataSourceUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
