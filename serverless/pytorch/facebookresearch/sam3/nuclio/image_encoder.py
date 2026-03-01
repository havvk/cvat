import torch
from typing import Any

class SAM3Encoder(torch.nn.Module):
    def __init__(self, sam3_tracker_model) -> None:
        super().__init__()
        self.model = sam3_tracker_model
        
        self.sam = self.model.sam2 if hasattr(self.model, "sam2") else self.model
        self.mask_decoder = getattr(self.sam, "sam_mask_decoder", getattr(self.sam, "mask_decoder", None))
        self.no_mem_embed = getattr(self.sam, "no_mem_embed", getattr(self.model, "no_mem_embed", None))
        self.num_feature_levels = getattr(self.sam.config, "num_feature_levels", 3) if hasattr(self.sam, "config") else 3

    def forward(self, x: torch.Tensor) -> tuple[Any, Any, Any]:
        vision_outputs = self.model.vision_encoder(x, output_hidden_states=True)
        
        fpn_features = vision_outputs.fpn_hidden_states if hasattr(vision_outputs, "fpn_hidden_states") else vision_outputs["fpn_hidden_states"]
        pos_encodings = vision_outputs.fpn_position_encoding if hasattr(vision_outputs, "fpn_position_encoding") else vision_outputs["fpn_position_encoding"]
        
        fpn_features_list = list(fpn_features)
        
        if self.mask_decoder is not None:
            fpn_features_list[0] = self.mask_decoder.conv_s0(fpn_features_list[0])
            fpn_features_list[1] = self.mask_decoder.conv_s1(fpn_features_list[1])
            
        feature_maps = fpn_features_list[-self.num_feature_levels:]
        vision_pos_embeds = list(pos_encodings)[-self.num_feature_levels:]
        
        feat_sizes = [(x.shape[-2], x.shape[-1]) for x in vision_pos_embeds]
        vision_feats = [x.flatten(2).permute(2, 0, 1) for x in feature_maps]
        
        if self.no_mem_embed is not None:
            vision_feats[-1] = vision_feats[-1] + self.no_mem_embed
            
        feats = [
            feat.permute(1, 2, 0).reshape(1, -1, *feat_size)
            for feat, feat_size in zip(vision_feats[::-1], feat_sizes[::-1])
        ][::-1]
        
        return feats[0], feats[1], feats[2]
