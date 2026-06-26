CREATE TABLE `persona_panel_member` (
  `panelId` int(10) unsigned NOT NULL,
  `personaId` int(10) unsigned NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`panelId`,`personaId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
