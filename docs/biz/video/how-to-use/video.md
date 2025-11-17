# 视频脚本

## 1st - How to use?

脚本：
- 00:00~00:08 这个视频给大家讲解一下如何使用 Background Remover，一共三步
- 00:09~00:15 第一步，上传你的图片
- 00:16~00:25 第二步，检查移除背景之后的图片效果，按住工具栏的对比图标，可以对比移除前后的效果
- 00:26~00:40 此外，点击工具栏的背景按钮，可以选择填充图片的背景颜色或者是图片
- 00:42~00:50 最后，点击工具栏的下载按钮即可保存图片到您的设备

纯文稿：
```txt
这个视频给大家讲解一下如何使用 Background Remover，一共三步

第一步，上传你的图片

第二步，检查移除背景之后的图片效果，按住工具栏的对比图标，可以对比移除前后的效果

此外，点击工具栏的背景按钮，可以选择填充图片的背景颜色或者是图片

最后，点击工具栏的下载按钮即可保存图片到您的设备
```

准备转音频：
```txt
This video explains how to use Background Remover in three steps.
<#1.0#>

Step one: Upload your image.
<#1.0#>

Step two: Check the effect after the background has been removed. Hold down the comparison icon on the toolbar to compare the before and after effects.
<#1.0#>

Additionally, click the background button on the toolbar to choose a background color or image to fill the picture.
<#1.0#>

Finally, click the download button on the toolbar to save the image to your device.
```

生图：
请你帮我将如下这段 AI 生图提示语优化成 JSON 字符串格式，以制作具有高吸引力的 YouTube 视频封面图为目标，提高审核，补充细节。最后输出到 @docs/biz/project/video.md 文件尾部。ultrathink

原 AI 生图提示语：
"""
A 16:9 YouTube video thumbnail featuring two elements from the attached images, focusing on introducing the website shown in the screenshot, with the woman on the left. Add caption "How to Use Background Remover".
"""

优化后的 JSON 格式提示语：
```json
{
  "image_config": {
    "aspect_ratio": "16:9",
    "resolution": "1920x1080",
    "output_format": "high-quality thumbnail",
    "use_case": "YouTube video cover"
  },
  "composition": {
    "layout": "split_composition",
    "left_section": {
      "element": "attractive_woman",
      "position": "left_third",
      "style": "professional_portrait",
      "expression": "friendly_and_engaging",
      "eye_contact": "direct_to_camera",
      "lighting": "soft_professional_lighting"
    },
    "right_section": {
      "element": "website_screenshot",
      "position": "right_two_thirds",
      "display_style": "clean_modern_interface",
      "angle": "slight_3d_perspective",
      "emphasis": "key_features_highlighted"
    }
  },
  "visual_elements": {
    "main_caption": {
      "text": "How to Use Background Remover",
      "position": "top_center_or_bottom_third",
      "font_style": "bold_sans_serif",
      "font_size": "48px",
      "color": "high_contrast_white_or_yellow",
      "background": "semi_transparent_dark_overlay",
      "effects": "subtle_shadow_or_glow"
    },
    "visual_effects": {
      "arrows_or_lines": "connecting woman to website",
      "accent_elements": "colorful geometric shapes or gradients",
      "depth": "layered composition with depth",
      "glow_effects": "subtle highlights on key areas"
    }
  },
  "color_scheme": {
    "primary_colors": ["vibrant_blue", "energetic_orange", "professional_purple"],
    "accent_colors": ["bright_yellow", "clean_white"],
    "background": "gradient or solid complementary color",
    "contrast": "high contrast for readability",
    "mood": "energetic, professional, trustworthy"
  },
  "style_requirements": {
    "overall_style": "modern, professional, eye-catching",
    "design_trend": "contemporary YouTube thumbnail style",
    "visual_hierarchy": "clear focal points",
    "clickability": "optimized for high CTR",
    "brand_alignment": "clean and approachable"
  },
  "technical_details": {
    "quality": "ultra-high resolution",
    "rendering": "photorealistic with graphic elements",
    "file_format": "PNG or JPEG optimized",
    "safe_zones": "text and important elements within safe margins",
    "mobile_optimization": "readable on small screens"
  },
  "content_safety": {
    "compliance": "YouTube community guidelines",
    "appropriateness": "family-friendly content",
    "copyright": "original design elements only",
    "authenticity": "genuine representation of product/service"
  },
}
```