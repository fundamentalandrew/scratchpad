CREATE TABLE `ax_url_terms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `urlPath` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `terms` varchar(3000) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=42830296 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
