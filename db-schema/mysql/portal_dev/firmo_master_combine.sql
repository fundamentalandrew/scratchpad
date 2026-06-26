CREATE TABLE `firmo_master_combine` (
  `firmoParentUuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `firmoChildUuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'In Progress',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`firmoParentUuid`,`firmoChildUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
