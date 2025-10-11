-- Migration: Add animation_duration column to videos table
-- 数据库迁移：为videos表添加animation_duration列

-- 添加animation_duration列（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='videos' 
        AND column_name='animation_duration'
    ) THEN
        ALTER TABLE videos 
        ADD COLUMN animation_duration DECIMAL(3, 1) DEFAULT 1.5;
        
        RAISE NOTICE 'Column animation_duration added successfully';
    ELSE
        RAISE NOTICE 'Column animation_duration already exists';
    END IF;
END $$;

-- 添加注释
COMMENT ON COLUMN videos.animation_duration IS '动画效果时长（秒）：0.5-5.0';

-- 显示结果
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name='videos' 
AND column_name='animation_duration';
