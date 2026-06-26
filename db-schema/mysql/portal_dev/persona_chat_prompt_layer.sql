CREATE TABLE `persona_chat_prompt_layer` (
  `layer` varchar(64) NOT NULL,
  `subLayer` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`layer`,`subLayer`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
